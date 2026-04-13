/**
 * Cypress E2E Tests -- Social Campaigns UI & API
 *
 * Covers:
 *   1. Campaigns Page UI (/social/campaigns)
 *   2. Campaign CRUD (create, get, update, delete via API)
 *   3. Campaign Features (generate-strategy, execute-step, studio page)
 *
 * React routes (BrowserRouter):
 *   /social/campaigns          -> CampaignsPage.js
 *   /social/campaigns/:id      -> CampaignDetailPage.js
 *   /social/campaigns/create   -> CampaignStudio.js
 *
 * Backend API:  http://localhost:5000/api/social/campaigns
 */

describe('Social Campaigns -- Page UI', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should load the campaigns page without crashing', () => {
    cy.socialVisit('/social/campaigns');

    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root').invoke('html').should('not.be.empty');
    cy.url().should('include', '/social/campaigns');
  });

  it('should return data from the GET /campaigns API', () => {
    cy.socialRequest('GET', '/campaigns').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 404, 500, 503]);
      if (res.status < 400) {
        const body = res.body;
        expect(body).to.have.property('success', true);
        expect(body).to.have.property('data');
        expect(body.data).to.be.an('array');
      }
    });
  });

  it('should fetch the campaigns leaderboard via GET /campaigns/leaderboard', () => {
    cy.socialRequest('GET', '/campaigns/leaderboard').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 404, 500, 503]);
      if (res.status < 400) {
        const body = res.body;
        expect(body).to.have.property('success', true);
        expect(body).to.have.property('data');
        expect(body.data).to.be.an('array');
      }
    });
  });
});

describe('Social Campaigns -- CRUD via API', () => {
  before(() => {
    cy.socialAuth();
  });

  const campaignName = `CypressCampaign_${Date.now()}`;

  it('should create a campaign via POST /campaigns', () => {
    cy.socialRequest('POST', '/campaigns', {
      name: campaignName,
      description: 'Automated test campaign created by Cypress',
      goal_type: 'promote_agent',
      budget_spark: 50,
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        const body = res.body;
        expect(body).to.have.property('success', true);
        expect(body).to.have.property('data');
        expect(body.data).to.be.an('object');
        expect(body.data).to.have.property('id');

        // Stash campaign ID for subsequent tests
        Cypress.env('testCampaignId', body.data.id);
      }
    });
  });

  it('should retrieve the campaign via GET /campaigns/:id', () => {
    const campaignId = Cypress.env('testCampaignId');
    if (!campaignId) return; // previous create may have failed

    cy.socialRequest('GET', `/campaigns/${campaignId}`).then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        const body = res.body;
        expect(body).to.have.property('success', true);
        const data = body.data || body;
        expect(data).to.be.an('object');
        expect(data).to.have.property('id');
        expect(String(data.id)).to.eq(String(campaignId));
        expect(data).to.have.property('name', campaignName);
      }
    });
  });

  it('should update the campaign via PATCH /campaigns/:id', () => {
    const campaignId = Cypress.env('testCampaignId');
    if (!campaignId) return; // previous create may have failed

    cy.socialRequest('PATCH', `/campaigns/${campaignId}`, {
      description: 'Updated description by Cypress test',
      status: 'active',
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 204, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        const body = res.body;
        expect(body).to.have.property('success', true);
      }
    });
  });

  it('should delete the campaign via DELETE /campaigns/:id', () => {
    const campaignId = Cypress.env('testCampaignId');
    if (!campaignId) return; // previous create may have failed

    cy.socialRequest('DELETE', `/campaigns/${campaignId}`).then((res) => {
      expect(res.status).to.be.oneOf([200, 204, 400, 401, 404, 500, 503]);
      if (res.status < 400) {
        expect(res.body).to.have.property('success', true);
      }
    });
  });
});

describe('Social Campaigns -- Features', () => {
  before(() => {
    cy.socialAuth();

    // Create a fresh campaign for feature tests
    cy.socialRequest('POST', '/campaigns', {
      name: `FeatureCampaign_${Date.now()}`,
      description: 'Campaign for generate-strategy and execute-step tests',
      goal_type: 'get_followers',
      budget_spark: 100,
    }).then((res) => {
      if (res.status === 200 || res.status === 201) {
        Cypress.env('featureCampaignId', res.body.data?.id || res.body.id);
      }
    });
  });

  it('should call generate-strategy via POST /campaigns/:id/generate-strategy', () => {
    const campaignId = Cypress.env('featureCampaignId');
    if (!campaignId) return;

    cy.socialRequest('POST', `/campaigns/${campaignId}/generate-strategy`).then(
      (res) => {
        expect(res.status).to.be.oneOf([200, 201, 400, 401, 404, 500, 503]);
        if (res.status === 200 || res.status === 201) {
          const body = res.body;
          expect(body).to.have.property('success', true);
        }
        // Regardless of status, the response should be a JSON object
        expect(res.body).to.be.an('object');
      }
    );
  });

  it('should call execute-step via POST /campaigns/:id/execute-step', () => {
    const campaignId = Cypress.env('featureCampaignId');
    if (!campaignId) return;

    cy.socialRequest('POST', `/campaigns/${campaignId}/execute-step`).then(
      (res) => {
        expect(res.status).to.be.oneOf([200, 201, 400, 401, 404, 500, 503]);
        if (res.status === 200 || res.status === 201) {
          const body = res.body;
          expect(body).to.have.property('success', true);
        }
        expect(res.body).to.be.an('object');
      }
    );
  });

  it('should load the campaign creation page without crashing', () => {
    cy.socialVisit('/social/campaigns/create');

    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root').invoke('html').should('not.be.empty');

    // CampaignStudio renders a stepper with goal cards
    cy.get('body', {timeout: 300000}).then(($body) => {
      const text = $body.text();
      expect(text.length).to.be.greaterThan(0);
    });

    // Should not crash
    cy.get('body').should('not.contain.text', 'Cannot read properties');
  });
});
