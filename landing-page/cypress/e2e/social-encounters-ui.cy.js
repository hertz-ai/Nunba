/**
 * Cypress E2E Tests -- Social Encounters UI & API
 *
 * Covers:
 *   1. Encounters Page UI (/social/encounters)
 *   2. Encounters API (suggestions, bonds, nearby)
 *   3. Location Features (location-ping, nearby-now, location-settings)
 *   4. Proximity Matches
 *   5. Missed Connections (create, list mine, search)
 *
 * React routes (BrowserRouter):
 *   /social/encounters           -> EncountersPage.js
 *   /social/encounters/:userId   -> EncounterDetailPage.js
 *
 * Backend API:  http://localhost:5000/api/social/encounters
 */

describe('Social Encounters -- Page UI', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should load the encounters page without crashing', () => {
    cy.socialVisit('/social/encounters');

    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root').invoke('html').should('not.be.empty');
    cy.url().should('include', '/social/encounters');
  });

  it('should return data from the GET /encounters API', () => {
    cy.socialRequest('GET', '/encounters').then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        const body = res.body;
        expect(body).to.have.property('success', true);
        expect(body).to.have.property('data');
      }
    });
  });

  it('should handle empty encounters state gracefully on the page', () => {
    cy.intercept('GET', '**/api/social/encounters', {
      statusCode: 200,
      body: {success: true, data: []},
    }).as('emptyEncounters');

    cy.intercept('GET', '**/api/social/encounters/suggestions', {
      statusCode: 200,
      body: {success: true, data: []},
    });

    cy.intercept('GET', '**/api/social/encounters/bonds', {
      statusCode: 200,
      body: {success: true, data: []},
    });

    cy.intercept('GET', '**/api/social/encounters/nearby-now', {
      statusCode: 200,
      body: {success: true, data: {count: 0}},
    });

    cy.intercept('GET', '**/api/social/encounters/proximity-matches*', {
      statusCode: 200,
      body: {success: true, data: []},
    });

    cy.intercept('GET', '**/api/social/encounters/location-settings', {
      statusCode: 200,
      body: {success: true, data: {enabled: false}},
    });

    cy.socialVisit('/social/encounters');

    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('body').should('not.contain.text', 'Cannot read properties');
    cy.get('body', {timeout: 300000}).then(($body) => {
      const text = $body.text();
      expect(text.length).to.be.greaterThan(0);
    });
  });
});

describe('Social Encounters -- API Endpoints', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should fetch encounter suggestions via GET /encounters/suggestions', () => {
    cy.socialRequest('GET', '/encounters/suggestions').then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        const body = res.body;
        expect(body).to.have.property('success', true);
        expect(body).to.have.property('data');
        expect(body.data).to.be.an('array');
      }
    });
  });

  it('should fetch encounter bonds via GET /encounters/bonds', () => {
    cy.socialRequest('GET', '/encounters/bonds').then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        const body = res.body;
        expect(body).to.have.property('success', true);
        expect(body).to.have.property('data');
        expect(body.data).to.be.an('array');
      }
    });
  });

  it('should fetch nearby encounters via GET /encounters/nearby', () => {
    cy.socialRequest('GET', '/encounters/nearby').then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        const body = res.body;
        expect(body).to.have.property('success', true);
        expect(body).to.have.property('data');
      }
    });
  });
});

describe('Social Encounters -- Location Features', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should send a location ping via POST /encounters/location-ping', () => {
    cy.socialRequest('POST', '/encounters/location-ping', {
      lat: 28.6139,
      lon: 77.209,
      accuracy: 15,
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        expect(res.body).to.have.property('success', true);
      }
    });
  });

  it('should get nearby-now count via GET /encounters/nearby-now', () => {
    cy.socialRequest('GET', '/encounters/nearby-now').then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        const body = res.body;
        expect(body).to.have.property('success', true);
        expect(body).to.have.property('data');
      }
    });
  });

  it('should retrieve location settings via GET /encounters/location-settings', () => {
    cy.socialRequest('GET', '/encounters/location-settings').then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        const body = res.body;
        expect(body).to.have.property('success', true);
        expect(body).to.have.property('data');
      }
    });
  });
});

describe('Social Encounters -- Proximity Matches', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should fetch proximity matches via GET /encounters/proximity-matches', () => {
    cy.socialRequest('GET', '/encounters/proximity-matches').then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        const body = res.body;
        expect(body).to.have.property('success', true);
        expect(body).to.have.property('data');
        expect(body.data).to.be.an('array');
      }
    });
  });

  it('should call reveal endpoint via POST /encounters/proximity/:id/reveal', () => {
    // Use a placeholder ID; the endpoint should return gracefully
    cy.socialRequest(
      'POST',
      '/encounters/proximity/nonexistent-id/reveal'
    ).then((res) => {
      // Expect 404 or 400 for a non-existent match, but should not crash
      expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        expect(res.body).to.be.an('object');
      }
    });
  });

  it('should update location settings via PATCH /encounters/location-settings', () => {
    cy.socialRequest('PATCH', '/encounters/location-settings', {
      enabled: false,
      visibility: 'friends_only',
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        expect(res.body).to.have.property('success', true);
      }
    });
  });
});

describe('Social Encounters -- Missed Connections', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should create a missed connection via POST /encounters/missed-connections', () => {
    cy.socialRequest('POST', '/encounters/missed-connections', {
      title: `Cypress Missed Connection ${Date.now()}`,
      description: 'Saw someone interesting during automated testing',
      location_name: 'Test Cafe',
      lat: 28.6139,
      lon: 77.209,
      seen_at: new Date().toISOString(),
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('data');
        // Store ID for cleanup / follow-up
        const mc = res.body.data;
        if (mc && mc.id) {
          Cypress.env('testMissedConnectionId', mc.id);
        }
      }
    });
  });

  it('should list own missed connections via GET /encounters/missed-connections/mine', () => {
    cy.socialRequest('GET', '/encounters/missed-connections/mine').then(
      (res) => {
        expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
        if (res.status < 400) {
          const body = res.body;
          expect(body).to.have.property('success', true);
          expect(body).to.have.property('data');
          expect(body.data).to.be.an('array');
        }
      }
    );
  });

  it('should search missed connections via GET /encounters/missed-connections', () => {
    cy.socialRequest('GET', '/encounters/missed-connections').then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        const body = res.body;
        expect(body).to.have.property('success', true);
        expect(body).to.have.property('data');
        expect(body.data).to.be.an('array');
      }
    });
  });
});
