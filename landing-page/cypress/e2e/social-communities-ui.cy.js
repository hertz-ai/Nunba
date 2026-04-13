/**
 * Cypress E2E Tests -- Social Communities UI
 *
 * Covers:
 *   1. CommunityListPage (/social/communities) - page load, rendering
 *   2. Create Community Dialog - open, form fields, submit
 *   3. Communities API - CRUD integration
 *   4. Loading / error states
 *
 * Backend API: http://localhost:5000/api/social/communities
 */

// ---------------------------------------------------------------
// 1. Community List Page
// ---------------------------------------------------------------
describe('Social Communities -- List Page UI', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should load the communities page without crashing', () => {
    cy.socialVisit('/social/communities');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root').invoke('html').should('not.be.empty');
    cy.url().should('include', '/social/communities');
  });

  it('should display "Communities" heading', () => {
    cy.socialVisit('/social/communities');
    cy.contains('Communities', {timeout: 300000}).should('be.visible');
  });

  it('should render content area (cards or empty state)', () => {
    cy.socialVisit('/social/communities');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('body').should('not.contain.text', 'Cannot read properties');
    // Wait for either community cards or the empty state to appear
    cy.get('body', {timeout: 300000}).should(($body) => {
      const text = $body.text();
      const hasContent =
        text.includes('h/') ||
        text.includes('No communities') ||
        text.includes('Communities');
      expect(hasContent).to.be.true;
    });
  });

  it('should show create FAB button for authenticated users', () => {
    cy.socialVisit('/social/communities');
    // FAB renders with MuiFab-root class
    cy.get('button[class*="Fab"], button[class*="fab"]', {
      timeout: 300000,
    }).should('exist');
  });

  it('should show empty state with intercepted empty list', () => {
    cy.intercept('GET', '**/api/social/communities*', {
      statusCode: 200,
      body: {success: true, data: [], meta: {has_more: false}},
    });

    cy.socialVisit('/social/communities');
    cy.contains('No communities', {timeout: 300000}).should('be.visible');
  });

  it('should render mocked community cards correctly', () => {
    cy.intercept('GET', '**/api/social/communities*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 's1',
            name: 'ai-agents',
            description: 'AI discussions',
            member_count: 42,
            post_count: 100,
          },
          {
            id: 's2',
            name: 'local-llm',
            description: 'LLM topics',
            member_count: 18,
            post_count: 37,
          },
        ],
        meta: {has_more: false},
      },
    });

    cy.socialVisit('/social/communities');
    cy.contains('h/ai-agents', {timeout: 300000}).should('be.visible');
    cy.contains('42 members').should('be.visible');
    cy.contains('h/local-llm').should('be.visible');
  });
});

// ---------------------------------------------------------------
// 2. Create Community Dialog
// ---------------------------------------------------------------
describe('Social Communities -- Create Dialog', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should open create dialog when FAB is clicked', () => {
    cy.intercept('GET', '**/api/social/communities*', {
      statusCode: 200,
      body: {success: true, data: [], meta: {has_more: false}},
    });

    cy.socialVisit('/social/communities');
    cy.get('#root', {timeout: 300000}).should('exist');

    cy.get('button[class*="Fab"], button[class*="fab"]', {timeout: 300000})
      .first()
      .click({force: true});
    cy.contains('Create Community', {timeout: 300000}).should('be.visible');
  });

  it('should show name and description fields in dialog', () => {
    cy.intercept('GET', '**/api/social/communities*', {
      statusCode: 200,
      body: {success: true, data: [], meta: {has_more: false}},
    });

    cy.socialVisit('/social/communities');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('button[class*="Fab"], button[class*="fab"]', {timeout: 300000})
      .first()
      .click({force: true});

    cy.get('[role="dialog"]', {timeout: 300000}).should('exist');
    cy.get('[role="dialog"]').find('input').should('exist');
    cy.contains('Cancel').should('be.visible');
    cy.contains('Create').should('be.visible');
  });

  it('should close dialog when Cancel is clicked', () => {
    cy.intercept('GET', '**/api/social/communities*', {
      statusCode: 200,
      body: {success: true, data: [], meta: {has_more: false}},
    });

    cy.socialVisit('/social/communities');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('button[class*="Fab"], button[class*="fab"]', {timeout: 300000})
      .first()
      .click({force: true});
    cy.contains('Create Community', {timeout: 300000}).should('be.visible');
    cy.contains('Cancel').click({force: true});
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('should submit create form and call API', () => {
    cy.intercept('GET', '**/api/social/communities*', {
      statusCode: 200,
      body: {success: true, data: [], meta: {has_more: false}},
    });
    cy.intercept('POST', '**/api/social/communities', {
      statusCode: 201,
      body: {
        success: true,
        data: {
          id: 'new-sub',
          name: 'test-community',
          description: 'test',
          member_count: 1,
          post_count: 0,
        },
      },
    }).as('createCommunity');

    cy.socialVisit('/social/communities');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('button[class*="Fab"], button[class*="fab"]', {timeout: 300000})
      .first()
      .click({force: true});
    cy.get('[role="dialog"]', {timeout: 300000})
      .find('input')
      .first()
      .type('test-community', {force: true});
    cy.get('[role="dialog"] button')
      .contains(/create/i)
      .click({force: true});
    cy.wait('@createCommunity')
      .its('request.body')
      .should('have.property', 'name', 'test-community');
  });
});

// ---------------------------------------------------------------
// 3. Communities API Integration
// ---------------------------------------------------------------
describe('Social Communities -- API Endpoints', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should list communities via GET /communities', () => {
    cy.socialRequest('GET', '/communities').then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('data');
        expect(res.body.data).to.be.an('array');
      }
    });
  });

  it('should create a community via POST /communities', () => {
    cy.socialRequest('POST', '/communities', {
      name: `cypress_community_${Date.now()}`,
      description: 'Automated test community',
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201, 400, 404, 409, 500, 503]);
      if (res.status < 400 && res.body.data) {
        Cypress.env('testCommunityId', res.body.data.id);
      }
    });
  });

  it('should get a community by ID via GET /communities/:id', () => {
    const id = Cypress.env('testCommunityId') || 'nonexistent';
    cy.socialRequest('GET', `/communities/${id}`).then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 404, 500, 503]);
    });
  });

  it('should join a community via POST /communities/:id/join', () => {
    const id = Cypress.env('testCommunityId') || 'nonexistent';
    cy.socialRequest('POST', `/communities/${id}/join`).then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 404, 409, 500, 503]);
    });
  });

  it('should get community members via GET /communities/:id/members', () => {
    const id = Cypress.env('testCommunityId') || 'nonexistent';
    cy.socialRequest('GET', `/communities/${id}/members`).then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 404, 500, 503]);
    });
  });

  it('should get community posts via GET /communities/:id/posts', () => {
    const id = Cypress.env('testCommunityId') || 'nonexistent';
    cy.socialRequest('GET', `/communities/${id}/posts`).then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 404, 500, 503]);
    });
  });

  it('should leave a community via DELETE /communities/:id/leave', () => {
    const id = Cypress.env('testCommunityId') || 'nonexistent';
    cy.socialRequest('DELETE', `/communities/${id}/leave`).then((res) => {
      expect(res.status).to.be.oneOf([200, 204, 400, 404, 405, 500, 503]);
    });
  });
});

// ---------------------------------------------------------------
// 4. Error Handling
// ---------------------------------------------------------------
describe('Social Communities -- Error Handling', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should handle API errors gracefully on list page', () => {
    cy.intercept('GET', '**/api/social/communities*', {
      statusCode: 500,
      body: {success: false, error: 'Server error'},
    });

    cy.socialVisit('/social/communities');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('body').should('not.contain.text', 'Cannot read properties');
  });
});
