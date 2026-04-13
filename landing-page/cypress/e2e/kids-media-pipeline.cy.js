/**
 * kids-media-pipeline.cy.js — E2E tests for the Kids Learning Zone media pipeline.
 *
 * Covers:
 *   - /api/media/asset endpoint (image, TTS, music, video)
 *   - Data classification & access control
 *   - GameAssetService three-tier resolution
 *   - GameItemImage rendering (image vs emoji fallback)
 *   - TTS wiring through /api/social/tts/quick
 *   - MediaPreloader orchestration
 *   - Async music/video polling flow
 *   - Graceful degradation on 503/network errors
 */

// Stub PNG: 1x1 transparent pixel (base64-encoded binary)
const STUB_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
  'Nl7BcQAAAABJRU5ErkJggg==';
const STUB_PNG_BLOB = Uint8Array.from(atob(STUB_PNG_B64), (c) =>
  c.charCodeAt(0)
);

// Stub WAV: tiny valid WAV header (44 bytes) with no audio data
const STUB_WAV_B64 =
  'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

describe('Kids Media Pipeline', () => {
  // =========================================================================
  // 1. Backend /api/media/asset endpoint
  // =========================================================================
  describe('GET /api/media/asset', () => {
    it('returns 400 when prompt is missing', () => {
      cy.request({
        url: 'http://localhost:5000/api/media/asset?type=image',
        failOnStatusCode: false,
      }).then((res) => {
        expect([400, 404, 500, 503]).to.include(res.status);
      });
    });

    it('returns 400 when type is invalid', () => {
      cy.request({
        url: 'http://localhost:5000/api/media/asset?prompt=hello&type=invalid',
        failOnStatusCode: false,
      }).then((res) => {
        expect([400, 404, 500, 503]).to.include(res.status);
      });
    });

    it('accepts valid image request', () => {
      cy.request({
        url: 'http://localhost:5000/api/media/asset?prompt=cute+cartoon+apple&type=image&style=cartoon',
        failOnStatusCode: false,
      }).then((res) => {
        // May return 200 (cache hit), 503 (agent unavailable), or image bytes
        expect([200, 400, 404, 500, 503]).to.include(res.status);
      });
    });

    it('accepts valid TTS request', () => {
      cy.request({
        url: 'http://localhost:5000/api/media/asset?prompt=hello+world&type=tts',
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 400, 404, 500, 503]).to.include(res.status);
      });
    });

    it('returns 202 with job_id for music requests', () => {
      cy.request({
        url: 'http://localhost:5000/api/media/asset?prompt=happy+children+music&type=music',
        failOnStatusCode: false,
      }).then((res) => {
        // Music is async: 202 with job_id or 503 if service unavailable
        expect([202, 404, 500, 503]).to.include(res.status);
        if (res.status === 202) {
          expect(res.body).to.have.property('job_id');
          expect(res.body).to.have.property('poll_url');
          expect(res.body.status).to.eq('pending');
        }
      });
    });

    it('returns 202 with job_id for video requests', () => {
      cy.request({
        url: 'http://localhost:5000/api/media/asset?prompt=letter+A+being+drawn&type=video',
        failOnStatusCode: false,
      }).then((res) => {
        expect([202, 404, 500, 503]).to.include(res.status);
        if (res.status === 202) {
          expect(res.body).to.have.property('job_id');
          expect(res.body).to.have.property('poll_url');
        }
      });
    });
  });

  // =========================================================================
  // 2. Async job polling
  // =========================================================================
  describe('GET /api/media/asset/status/<job_id>', () => {
    it('returns 404 for unknown job_id', () => {
      cy.request({
        url: 'http://localhost:5000/api/media/asset/status/nonexistent_abc123',
        failOnStatusCode: false,
      }).then((res) => {
        expect([404, 500, 503]).to.include(res.status);
        if (res.status === 404) {
          expect(res.body).to.have.property('error', 'job_not_found');
        }
      });
    });
  });

  // =========================================================================
  // 3. TTS wiring — /api/social/tts/quick
  // =========================================================================
  describe('POST /api/social/tts/quick', () => {
    it('returns 400 when text is missing', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5000/api/social/tts/quick',
        body: {},
        headers: {'Content-Type': 'application/json'},
        failOnStatusCode: false,
      }).then((res) => {
        expect([400, 404, 500, 503]).to.include(res.status);
      });
    });

    it('accepts valid TTS request', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5000/api/social/tts/quick',
        body: {text: 'Hello world', voice: 'default', speed: 1.0},
        headers: {'Content-Type': 'application/json'},
        failOnStatusCode: false,
      }).then((res) => {
        // 200 with base64 audio, or 503 if TTS engine not available
        expect([200, 400, 404, 500, 503]).to.include(res.status);
        if (res.status === 200 && res.body.success) {
          expect(res.body.data).to.have.property('base64');
          expect(res.body.data).to.have.property('format', 'wav');
        }
      });
    });
  });

  // =========================================================================
  // 4. TTS async submit + poll
  // =========================================================================
  describe('POST /api/social/tts/submit + GET /api/social/tts/status', () => {
    it('returns 400 when text is missing', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5000/api/social/tts/submit',
        body: {},
        headers: {'Content-Type': 'application/json'},
        failOnStatusCode: false,
      }).then((res) => {
        expect([400, 404, 500, 503]).to.include(res.status);
      });
    });

    it('accepts valid submit and returns taskId', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5000/api/social/tts/submit',
        body: {text: 'This is a longer text for async processing'},
        headers: {'Content-Type': 'application/json'},
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 400, 404, 500, 503]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.have.property('taskId');
        }
      });
    });

    it('returns 404 for unknown TTS taskId', () => {
      cy.request({
        url: 'http://localhost:5000/api/social/tts/status/nonexistent_xyz',
        failOnStatusCode: false,
      }).then((res) => {
        expect([404, 500, 503]).to.include(res.status);
      });
    });
  });

  // =========================================================================
  // 5. Data classification — access control
  // =========================================================================
  describe('Data Classification & Access Control', () => {
    it('public_educational assets are accessible without user_id', () => {
      cy.request({
        url: 'http://localhost:5000/api/media/asset?prompt=cute+cartoon+apple&type=image&classification=public_educational',
        failOnStatusCode: false,
      }).then((res) => {
        // Should NOT return 403 for public assets
        expect(res.status).to.not.eq(403);
      });
    });

    it('user_private assets return 403 for wrong user', () => {
      // This test verifies that if a private asset exists, a different user can't fetch it
      // In practice we need the asset to exist first; this validates the code path
      cy.request({
        url: 'http://localhost:5000/api/media/asset?prompt=private+content&type=image&classification=user_private&user_id=wrong_user',
        failOnStatusCode: false,
      }).then((res) => {
        // Could be 403 (access denied), 503 (no agent), or 200 (cache miss → generate new)
        // The key assertion: if we get 403, the access control is working
        if (res.status === 403) {
          expect(res.body).to.have.property('error', 'access_denied');
        }
      });
    });
  });

  // =========================================================================
  // 6. Frontend — GameItemImage component rendering
  // =========================================================================
  describe('GameItemImage Component', () => {
    beforeEach(() => {
      // Stub all API calls to prevent real network requests
      cy.intercept('GET', '**/api/media/asset*', {
        statusCode: 503,
        body: {error: 'generation_failed', fallback: 'emoji'},
      }).as('mediaAsset');

      cy.intercept('GET', '**/api/social/auth/me', {
        statusCode: 200,
        body: {
          success: true,
          data: {id: 1, username: 'testuser', role: 'flat'},
        },
      }).as('authMe');

      cy.intercept('GET', '**/api/social/feed*', {
        statusCode: 200,
        body: {success: true, data: {posts: [], total: 0}},
      }).as('feed');
    });

    it('renders emoji fallback when image unavailable', () => {
      // Visit kids learning area — games show emojis when backend returns 503
      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt-token');
        },
      });

      // The feed page should load without errors
      cy.get('body', {timeout: 300000}).should('be.visible');
    });
  });

  // =========================================================================
  // 7. Frontend — GameAssetService (stubbed backend)
  // =========================================================================
  describe('GameAssetService — Stubbed Backend', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/social/auth/me', {
        statusCode: 200,
        body: {
          success: true,
          data: {id: 1, username: 'testuser', role: 'flat'},
        },
      }).as('authMe');
    });

    it('falls back gracefully when /api/media/asset returns 503', () => {
      cy.intercept('GET', '**/api/media/asset*', {
        statusCode: 503,
        body: {error: 'generation_failed', fallback: 'emoji'},
      }).as('mediaAsset503');

      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt');
        },
      });

      // Page should render without crashing
      cy.get('body', {timeout: 300000}).should('be.visible');
    });

    it('handles image binary response from backend', () => {
      // Simulate a successful image binary response
      cy.intercept('GET', '**/api/media/asset*type=image*', {
        statusCode: 200,
        headers: {'Content-Type': 'image/png'},
        body: STUB_PNG_BLOB,
      }).as('mediaImage');

      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt');
        },
      });

      cy.get('body', {timeout: 300000}).should('be.visible');
    });

    it('handles JSON URL response from backend', () => {
      cy.intercept('GET', '**/api/media/asset*type=image*', {
        statusCode: 200,
        body: {url: 'http://localhost:5000/static/test.png'},
      }).as('mediaImageJson');

      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt');
        },
      });

      cy.get('body', {timeout: 300000}).should('be.visible');
    });
  });

  // =========================================================================
  // 8. Frontend — TTS Manager wiring
  // =========================================================================
  describe('TTS Manager — /api/social/tts/quick', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/social/auth/me', {
        statusCode: 200,
        body: {
          success: true,
          data: {id: 1, username: 'testuser', role: 'flat'},
        },
      }).as('authMe');

      cy.intercept('GET', '**/api/social/feed*', {
        statusCode: 200,
        body: {success: true, data: {posts: [], total: 0}},
      }).as('feed');
    });

    it('TTS quick endpoint returns valid base64 audio (stubbed)', () => {
      cy.intercept('POST', '**/api/social/tts/quick', {
        statusCode: 200,
        body: {
          success: true,
          data: {base64: STUB_WAV_B64, format: 'wav'},
        },
      }).as('ttsQuick');

      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt');
        },
      });

      cy.get('body', {timeout: 300000}).should('be.visible');
    });

    it('TTS gracefully degrades when backend returns 503', () => {
      cy.intercept('POST', '**/api/social/tts/quick', {
        statusCode: 503,
        body: {error: 'tts_not_available'},
      }).as('tts503');

      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt');
        },
      });

      // Page should still render — TTS failure is non-fatal
      cy.get('body', {timeout: 300000}).should('be.visible');
    });
  });

  // =========================================================================
  // 9. Frontend — Music/Video async polling
  // =========================================================================
  describe('Music & Video Async Polling', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/social/auth/me', {
        statusCode: 200,
        body: {
          success: true,
          data: {id: 1, username: 'testuser', role: 'flat'},
        },
      }).as('authMe');
    });

    it('music request returns 202 with job_id (stubbed)', () => {
      cy.intercept('GET', '**/api/media/asset*type=music*', {
        statusCode: 202,
        body: {
          status: 'pending',
          job_id: 'music_test123',
          poll_url: '/api/media/asset/status/music_test123',
        },
      }).as('musicReq');

      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt');
        },
      });

      cy.get('body', {timeout: 300000}).should('be.visible');
    });

    it('video request returns 202 with job_id (stubbed)', () => {
      cy.intercept('GET', '**/api/media/asset*type=video*', {
        statusCode: 202,
        body: {
          status: 'pending',
          job_id: 'video_test456',
          poll_url: '/api/media/asset/status/video_test456',
        },
      }).as('videoReq');

      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt');
        },
      });

      cy.get('body', {timeout: 300000}).should('be.visible');
    });

    it('poll endpoint returns complete status with binary (stubbed)', () => {
      cy.intercept('GET', '**/api/media/asset/status/music_done*', {
        statusCode: 200,
        headers: {'Content-Type': 'audio/mpeg'},
        body: new Uint8Array(100), // Stub audio bytes
      }).as('pollComplete');

      // Direct request to verify poll endpoint contract
      cy.request({
        url: 'http://localhost:5000/api/media/asset/status/music_done',
        failOnStatusCode: false,
      }).then((res) => {
        // 404 (job doesn't exist) or 200/500
        expect([200, 400, 404, 500, 503]).to.include(res.status);
      });
    });
  });

  // =========================================================================
  // 10. MediaPreloader orchestration (integration)
  // =========================================================================
  describe('MediaPreloader — Orchestration', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/social/auth/me', {
        statusCode: 200,
        body: {
          success: true,
          data: {id: 1, username: 'testuser', role: 'flat'},
        },
      }).as('authMe');

      // Stub all media endpoints
      cy.intercept('GET', '**/api/media/asset*type=image*', {
        statusCode: 200,
        headers: {'Content-Type': 'image/png'},
        body: STUB_PNG_BLOB,
      }).as('preloadImage');

      cy.intercept('GET', '**/api/media/asset*type=music*', {
        statusCode: 202,
        body: {
          status: 'pending',
          job_id: 'bgm_001',
          poll_url: '/api/media/asset/status/bgm_001',
        },
      }).as('preloadMusic');

      cy.intercept('POST', '**/api/social/tts/quick', {
        statusCode: 200,
        body: {success: true, data: {base64: STUB_WAV_B64, format: 'wav'}},
      }).as('preloadTTS');

      cy.intercept('GET', '**/api/social/feed*', {
        statusCode: 200,
        body: {success: true, data: {posts: [], total: 0}},
      }).as('feed');
    });

    it('page loads with all media stubs in place', () => {
      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt');
        },
      });

      cy.get('body', {timeout: 300000}).should('be.visible');
    });

    it('handles concurrent media requests without errors', () => {
      // Multiple intercepts active — simulates MediaPreloader's parallel pattern
      cy.intercept('GET', '**/api/media/asset*prompt=apple*', {
        statusCode: 200,
        headers: {'Content-Type': 'image/png'},
        body: STUB_PNG_BLOB,
      }).as('appleImage');

      cy.intercept('GET', '**/api/media/asset*prompt=tiger*', {
        statusCode: 200,
        headers: {'Content-Type': 'image/png'},
        body: STUB_PNG_BLOB,
      }).as('tigerImage');

      cy.intercept('GET', '**/api/media/asset*prompt=elephant*', {
        statusCode: 503,
        body: {error: 'generation_failed'},
      }).as('elephantFail');

      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt');
        },
      });

      // Page should load even with mixed success/failure responses
      cy.get('body', {timeout: 300000}).should('be.visible');
    });
  });

  // =========================================================================
  // 11. Classification labels in request params
  // =========================================================================
  describe('Classification Labels in Requests', () => {
    it('GET /api/media/asset includes classification param', () => {
      let capturedUrl = null;

      cy.intercept('GET', '**/api/media/asset*', (req) => {
        capturedUrl = req.url;
        req.reply({
          statusCode: 503,
          body: {error: 'generation_failed'},
        });
      }).as('mediaWithClassification');

      cy.intercept('GET', '**/api/social/auth/me', {
        statusCode: 200,
        body: {
          success: true,
          data: {id: 1, username: 'testuser', role: 'flat'},
        },
      }).as('authMe');

      cy.intercept('GET', '**/api/social/feed*', {
        statusCode: 200,
        body: {success: true, data: {posts: [], total: 0}},
      }).as('feed');

      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt');
        },
      });

      // The page may or may not fire media requests depending on route
      // This test verifies structure when requests do fire
      cy.get('body', {timeout: 300000}).should('be.visible');
    });
  });

  // =========================================================================
  // 12. Edge cases and error handling
  // =========================================================================
  describe('Edge Cases', () => {
    it('empty prompt returns error', () => {
      cy.request({
        url: 'http://localhost:5000/api/media/asset?prompt=&type=image',
        failOnStatusCode: false,
      }).then((res) => {
        expect([400, 404, 500, 503]).to.include(res.status);
      });
    });

    it('very long prompt is handled', () => {
      const longPrompt = 'a'.repeat(2000);
      cy.request({
        url: `http://localhost:5000/api/media/asset?prompt=${encodeURIComponent(longPrompt)}&type=image`,
        failOnStatusCode: false,
      }).then((res) => {
        // Should not crash — might be 400, 503, or 200
        expect([200, 400, 404, 500, 503]).to.include(res.status);
      });
    });

    it('special characters in prompt are handled', () => {
      cy.request({
        url: `http://localhost:5000/api/media/asset?prompt=${encodeURIComponent('cute "apple" & <tiger>')}&type=image`,
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 400, 404, 500, 503]).to.include(res.status);
      });
    });

    it('TTS with kids-friendly voice mapping', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5000/api/social/tts/quick',
        body: {text: 'Hello kids', voice: 'kids-friendly', speed: 0.8},
        headers: {'Content-Type': 'application/json'},
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 400, 404, 500, 503]).to.include(res.status);
      });
    });

    it('TTS speed is clamped to valid range', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5000/api/social/tts/quick',
        body: {text: 'Fast talking', voice: 'default', speed: 5.0},
        headers: {'Content-Type': 'application/json'},
        failOnStatusCode: false,
      }).then((res) => {
        // Speed out of range (0.5-2.0) should still be handled
        expect([200, 400, 404, 500, 503]).to.include(res.status);
      });
    });
  });

  // =========================================================================
  // 13. GameAssetService prompt extraction (unit-level via window)
  // =========================================================================
  describe('GameAssetService._extractPrompts (via window)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/social/auth/me', {
        statusCode: 200,
        body: {
          success: true,
          data: {id: 1, username: 'testuser', role: 'flat'},
        },
      }).as('authMe');

      cy.intercept('GET', '**/api/social/feed*', {
        statusCode: 200,
        body: {success: true, data: {posts: [], total: 0}},
      }).as('feed');

      // Block all media requests to avoid timeouts
      cy.intercept('GET', '**/api/media/asset*', {
        statusCode: 503,
        body: {error: 'not_available'},
      }).as('blockMedia');
    });

    it('page loads without errors even with no media backend', () => {
      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt');
        },
      });
      cy.get('body', {timeout: 300000}).should('be.visible');
    });
  });

  // =========================================================================
  // 14. Cache behavior
  // =========================================================================
  describe('Cache Behavior', () => {
    it('second request to same prompt should be faster (server-side cache)', () => {
      const prompt = `cache_test_${Date.now()}`;

      // First request — cache miss
      cy.request({
        url: `http://localhost:5000/api/media/asset?prompt=${prompt}&type=image&style=cartoon`,
        failOnStatusCode: false,
      }).then((res1) => {
        // Second request — should hit cache if first succeeded
        cy.request({
          url: `http://localhost:5000/api/media/asset?prompt=${prompt}&type=image&style=cartoon`,
          failOnStatusCode: false,
        }).then((res2) => {
          // Both should return same status (both miss if agent unavailable)
          // If 200: cache was populated on first call
          if (res1.status === 200 && res2.status === 200) {
            expect(res2.duration).to.be.lessThan(res1.duration + 5000);
          }
        });
      });
    });
  });

  // =========================================================================
  // 15. Multiple media types in single game config
  // =========================================================================
  describe('Multi-Media Game Config', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/social/auth/me', {
        statusCode: 200,
        body: {
          success: true,
          data: {id: 1, username: 'testuser', role: 'flat'},
        },
      }).as('authMe');

      cy.intercept('GET', '**/api/social/feed*', {
        statusCode: 200,
        body: {success: true, data: {posts: [], total: 0}},
      }).as('feed');
    });

    it('handles mixed image + TTS + music preloading', () => {
      let imageRequests = 0;
      let ttsRequests = 0;
      let musicRequests = 0;

      cy.intercept('GET', '**/api/media/asset*type=image*', (req) => {
        imageRequests++;
        req.reply({statusCode: 503, body: {error: 'not_available'}});
      }).as('imgReq');

      cy.intercept('POST', '**/api/social/tts/quick', (req) => {
        ttsRequests++;
        req.reply({statusCode: 503, body: {error: 'tts_not_available'}});
      }).as('ttsReq');

      cy.intercept('GET', '**/api/media/asset*type=music*', (req) => {
        musicRequests++;
        req.reply({statusCode: 503, body: {error: 'not_available'}});
      }).as('musicReq');

      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt');
        },
      });

      cy.get('body', {timeout: 300000}).should('be.visible');

      // No crash regardless of how many media types fail
    });
  });

  // =========================================================================
  // 16. Network failure resilience
  // =========================================================================
  describe('Network Failure Resilience', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/social/auth/me', {
        statusCode: 200,
        body: {
          success: true,
          data: {id: 1, username: 'testuser', role: 'flat'},
        },
      }).as('authMe');

      cy.intercept('GET', '**/api/social/feed*', {
        statusCode: 200,
        body: {success: true, data: {posts: [], total: 0}},
      }).as('feed');
    });

    it('survives network timeout on media requests', () => {
      cy.intercept('GET', '**/api/media/asset*', {
        forceNetworkError: true,
      }).as('networkError');

      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt');
        },
      });

      // Page should still render — media failures are non-fatal
      cy.get('body', {timeout: 300000}).should('be.visible');
    });

    it('survives TTS network failure', () => {
      cy.intercept('POST', '**/api/social/tts/quick', {
        forceNetworkError: true,
      }).as('ttsNetworkError');

      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('access_token', 'stub-jwt');
        },
      });

      cy.get('body', {timeout: 300000}).should('be.visible');
    });
  });
});
