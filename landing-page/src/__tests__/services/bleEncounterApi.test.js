/**
 * bleEncounterApi.test.js — Unit tests for the BLE physical-world
 * encounter client wrapper exported from socialApi.js.
 *
 * Backfills test coverage for the methods that shipped without tests
 * in commit 65084ae2 ("feat(social): bleEncounterApi client wraps
 * /api/social/encounter/*").  Flagged by master-orchestrator backfill
 * run aa3ead1 as W0b B2 REWORK.
 *
 * Each test asserts that the method calls the mocked axios client
 * with the correct URL AND body shape — the wire contract is the
 * authority (PRODUCT_MAP J200-J215, HARTOS encounter_api.py).
 *
 * Strategy (matches socialApi.test.js convention): mock the
 * './axiosFactory' module so createApiClient() returns a single
 * stable mock with jest.fn() spies for get/post/patch/put/delete.
 */

// Build the mock client — returned for every createApiClient() call
const mockAxiosInstance = {
  get: jest.fn(() => Promise.resolve({data: {}})),
  post: jest.fn(() => Promise.resolve({data: {}})),
  patch: jest.fn(() => Promise.resolve({data: {}})),
  put: jest.fn(() => Promise.resolve({data: {}})),
  delete: jest.fn(() => Promise.resolve({data: {}})),
};

jest.mock('../../services/axiosFactory', () => {
  // Must build the object inside the factory — cannot reference outer const
  return {
    createApiClient: jest.fn(() => mockAxiosInstance),
  };
});

// Now import the API that uses createApiClient internally
const {bleEncounterApi} = require('../../services/socialApi');

beforeEach(() => {
  jest.clearAllMocks();
});

// ── getDiscoverable / setDiscoverable (J200, J201) ────────────────────────
describe('bleEncounterApi.getDiscoverable', () => {
  it('calls GET /encounter/discoverable with no body', async () => {
    await bleEncounterApi.getDiscoverable();
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/encounter/discoverable'
    );
  });
});

describe('bleEncounterApi.setDiscoverable', () => {
  it('calls POST /encounter/discoverable with all fields coerced', async () => {
    await bleEncounterApi.setDiscoverable({
      enabled: true,
      age_claim_18: true,
      ttl_sec: 3600,
      face_visible: true,
      avatar_style: 'pixel_art',
      vibe_tags: ['hiking', 'coffee'],
    });
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/encounter/discoverable',
      {
        enabled: true,
        age_claim_18: true,
        ttl_sec: 3600,
        face_visible: true,
        avatar_style: 'pixel_art',
        vibe_tags: ['hiking', 'coffee'],
      }
    );
  });

  it('coerces enabled/age_claim_18/face_visible to booleans via !!', async () => {
    // Pass truthy non-booleans — wrapper must boolean-coerce
    await bleEncounterApi.setDiscoverable({
      enabled: 1,
      age_claim_18: 'yes',
      ttl_sec: 60,
      face_visible: {},
      avatar_style: 'studio_ghibli',
      vibe_tags: [],
    });
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/encounter/discoverable',
      {
        enabled: true,
        age_claim_18: true,
        ttl_sec: 60,
        face_visible: true,
        avatar_style: 'studio_ghibli',
        vibe_tags: [],
      }
    );
  });

  it('coerces falsy enabled/age_claim_18 to false (consent is never implied)', async () => {
    await bleEncounterApi.setDiscoverable({
      enabled: undefined,
      age_claim_18: 0,
      ttl_sec: 120,
      face_visible: 0,
      avatar_style: 'studio_ghibli',
      vibe_tags: [],
    });
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/encounter/discoverable',
      {
        enabled: false,
        age_claim_18: false,
        ttl_sec: 120,
        face_visible: false,
        avatar_style: 'studio_ghibli',
        vibe_tags: [],
      }
    );
  });

  // The server keeps the stored face_visible / avatar_style when a toggle
  // omits them (like vibe_tags), so "not given" must not go on the wire as
  // false / 'studio_ghibli' (that reset them on every toggle).
  it.each([
    ['undefined', {face_visible: undefined, avatar_style: undefined}],
    ['null', {face_visible: null, avatar_style: null}],
    ['absent', {}],
  ])('omits face_visible and avatar_style when %s', async (_label, extra) => {
    await bleEncounterApi.setDiscoverable({
      enabled: true,
      age_claim_18: true,
      ...extra,
    });
    const body = mockAxiosInstance.post.mock.calls[0][1];
    expect(body).not.toHaveProperty('face_visible');
    expect(body).not.toHaveProperty('avatar_style');
    expect(body).toMatchObject({enabled: true, age_claim_18: true});
  });

  // vibe_tags is also written by the persona card (PUT /encounter/persona).
  // A toggle that sends [] for "not given" wipes the user's saved tags, so
  // the wrapper sends vibe_tags only when the caller passes them.
  it.each([
    ['undefined', {vibe_tags: undefined}],
    ['null', {vibe_tags: null}],
    ['absent', {}],
  ])('omits vibe_tags when the caller passes %s', async (_label, tags) => {
    await bleEncounterApi.setDiscoverable({
      enabled: true,
      age_claim_18: true,
      ttl_sec: 600,
      face_visible: true,
      avatar_style: 'pixel_art',
      ...tags,
    });
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    const body = mockAxiosInstance.post.mock.calls[0][1];
    expect(body).not.toHaveProperty('vibe_tags');
    expect(body).toMatchObject({enabled: true, age_claim_18: true});
  });

  it('sends an explicit [] (the user removed every tag)', async () => {
    await bleEncounterApi.setDiscoverable({
      enabled: false,
      age_claim_18: false,
      vibe_tags: [],
    });
    const body = mockAxiosInstance.post.mock.calls[0][1];
    expect(body.vibe_tags).toEqual([]);
  });

  it('passes ttl_sec=undefined when falsy (server treats as default)', async () => {
    // ttl_sec uses `ttl_sec || undefined` — 0 / null / undefined → undefined
    await bleEncounterApi.setDiscoverable({
      enabled: true,
      age_claim_18: true,
      ttl_sec: 0,
      face_visible: false,
      avatar_style: 'studio_ghibli',
      vibe_tags: [],
    });
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/encounter/discoverable',
      expect.objectContaining({ttl_sec: undefined})
    );
  });
});

// ── persona card: getPersona / setPersona ─────────────────────────────────
describe('bleEncounterApi persona card', () => {
  it('getPersona calls GET /encounter/persona', async () => {
    await bleEncounterApi.getPersona();
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/encounter/persona');
  });

  it('setPersona PUTs only the fields it is given', async () => {
    await bleEncounterApi.setPersona({interests_discoverable: true});
    expect(mockAxiosInstance.put).toHaveBeenCalledWith('/encounter/persona', {
      interests_discoverable: true,
    });
  });
});

// ── registerPubkey (J200) ─────────────────────────────────────────────────
describe('bleEncounterApi.registerPubkey', () => {
  it('calls POST /encounter/register-pubkey with {pubkey}', async () => {
    await bleEncounterApi.registerPubkey('abc123hexkey');
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/encounter/register-pubkey',
      {pubkey: 'abc123hexkey'}
    );
  });
});

// ── reportSighting (J203) ─────────────────────────────────────────────────
describe('bleEncounterApi.reportSighting', () => {
  it('calls POST /encounter/sighting with full sighting payload', async () => {
    await bleEncounterApi.reportSighting({
      peer_pubkey: 'peer_xyz',
      rssi_peak: -45,
      dwell_sec: 12,
      lat: 12.9716,
      lng: 77.5946,
    });
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/encounter/sighting',
      {
        peer_pubkey: 'peer_xyz',
        rssi_peak: -45,
        dwell_sec: 12,
        lat: 12.9716,
        lng: 77.5946,
      }
    );
  });

  it('forwards undefined location fields verbatim (no coercion)', async () => {
    await bleEncounterApi.reportSighting({
      peer_pubkey: 'peer_xyz',
      rssi_peak: -70,
      dwell_sec: 5,
      lat: undefined,
      lng: undefined,
    });
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/encounter/sighting',
      {
        peer_pubkey: 'peer_xyz',
        rssi_peak: -70,
        dwell_sec: 5,
        lat: undefined,
        lng: undefined,
      }
    );
  });
});

// ── swipe (J204, J205) ────────────────────────────────────────────────────
describe('bleEncounterApi.swipe', () => {
  it('calls POST /encounter/swipe with {sighting_id, decision} for like', async () => {
    await bleEncounterApi.swipe('sight_42', 'like');
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/encounter/swipe', {
      sighting_id: 'sight_42',
      decision: 'like',
    });
  });

  it('calls POST /encounter/swipe with dislike decision', async () => {
    await bleEncounterApi.swipe('sight_99', 'dislike');
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/encounter/swipe', {
      sighting_id: 'sight_99',
      decision: 'dislike',
    });
  });
});

// ── listMatches (J204) ────────────────────────────────────────────────────
describe('bleEncounterApi.listMatches', () => {
  it('calls GET /encounter/matches with no body', async () => {
    await bleEncounterApi.listMatches();
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/encounter/matches');
  });
});

// ── listMapPins (J211) ────────────────────────────────────────────────────
describe('bleEncounterApi.listMapPins', () => {
  it('calls GET /encounter/map-pins with no body', async () => {
    await bleEncounterApi.listMapPins();
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/encounter/map-pins');
  });
});

// ── draftIcebreaker (J207) ────────────────────────────────────────────────
describe('bleEncounterApi.draftIcebreaker', () => {
  it('calls POST /encounter/icebreaker/draft with {match_id}', async () => {
    await bleEncounterApi.draftIcebreaker('match_007');
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/encounter/icebreaker/draft',
      {match_id: 'match_007'}
    );
  });
});

// ── approveIcebreaker / declineIcebreaker (J209, J210) ────────────────────
describe('bleEncounterApi.approveIcebreaker', () => {
  it('calls POST /encounter/icebreaker/approve with {match_id, text}', async () => {
    await bleEncounterApi.approveIcebreaker('match_007', 'hi there!');
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/encounter/icebreaker/approve',
      {match_id: 'match_007', text: 'hi there!'}
    );
  });
});

describe('bleEncounterApi.declineIcebreaker', () => {
  it('calls POST /encounter/icebreaker/decline with {match_id, reason}', async () => {
    await bleEncounterApi.declineIcebreaker('match_007', 'tone_off');
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/encounter/icebreaker/decline',
      {match_id: 'match_007', reason: 'tone_off'}
    );
  });
});

// ── topics (WAMP topic registry — single source via server) ───────────────
describe('bleEncounterApi.topics', () => {
  it('calls GET /encounter/topics with no body', async () => {
    await bleEncounterApi.topics();
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/encounter/topics');
  });
});

// ── API surface completeness ──────────────────────────────────────────────
describe('bleEncounterApi structure', () => {
  it('exports all 11 methods named in commit 65084ae2', () => {
    expect(typeof bleEncounterApi.getDiscoverable).toBe('function');
    expect(typeof bleEncounterApi.setDiscoverable).toBe('function');
    expect(typeof bleEncounterApi.registerPubkey).toBe('function');
    expect(typeof bleEncounterApi.reportSighting).toBe('function');
    expect(typeof bleEncounterApi.swipe).toBe('function');
    expect(typeof bleEncounterApi.listMatches).toBe('function');
    expect(typeof bleEncounterApi.listMapPins).toBe('function');
    expect(typeof bleEncounterApi.draftIcebreaker).toBe('function');
    expect(typeof bleEncounterApi.approveIcebreaker).toBe('function');
    expect(typeof bleEncounterApi.declineIcebreaker).toBe('function');
    expect(typeof bleEncounterApi.topics).toBe('function');
  });
});
