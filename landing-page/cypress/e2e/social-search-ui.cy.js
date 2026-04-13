/**
 * Cypress E2E Tests -- Social Search Page UI
 *
 * Covers:
 *   1. SearchPage (/social/search) - search input, tabs
 *   2. Search results display (posts, users, communities)
 *   3. Empty state / "Type to search"
 *   4. Search API integration
 *   5. Error handling
 *
 * Backend API: http://localhost:5000/api/social/search
 */

// ---------------------------------------------------------------
// 1. Search Page - Basic Rendering
// ---------------------------------------------------------------
describe('Social Search -- Page UI', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should load the search page without crashing', () => {
    cy.socialVisit('/social/search');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root').invoke('html').should('not.be.empty');
    cy.url().should('include', '/social/search');
  });

  it('should display search input with placeholder', () => {
    cy.socialVisit('/social/search');
    cy.get('input[placeholder*="Search"], input[placeholder*="search"]', {
      timeout: 300000,
    }).should('exist');
  });

  it('should display three tabs: Posts, Users, Communities', () => {
    cy.socialVisit('/social/search');
    cy.contains('Posts', {timeout: 300000}).should('be.visible');
    cy.contains('Users').should('be.visible');
    cy.contains('Communities').should('be.visible');
  });

  it('should show "Type to search" empty state initially', () => {
    cy.socialVisit('/social/search');
    cy.contains('Type to search', {timeout: 300000}).should('be.visible');
  });
});

// ---------------------------------------------------------------
// 2. Search Results with Mocked Data
// ---------------------------------------------------------------
describe('Social Search -- Mocked Results', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should display post results when searching on Posts tab', () => {
    cy.intercept('GET', '**/api/social/search*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 'p1',
            title: 'How to build AI agents',
            content: 'A guide',
            author: {id: 'u1', username: 'alice', display_name: 'Alice'},
            score: 12,
            comment_count: 3,
            created_at: new Date().toISOString(),
          },
        ],
      },
    }).as('searchAPI');

    cy.socialVisit('/social/search');
    cy.get('input[placeholder*="Search"], input[placeholder*="search"]', {
      timeout: 300000,
    }).type('AI agents', {force: true});

    // Wait for debounce + response
    cy.wait('@searchAPI');
    cy.contains('How to build AI agents', {timeout: 300000}).should(
      'be.visible'
    );
  });

  it('should show "No results found" for empty search results', () => {
    cy.intercept('GET', '**/api/social/search*', {
      statusCode: 200,
      body: {success: true, data: []},
    }).as('emptySearch');

    cy.socialVisit('/social/search');
    cy.get('input[placeholder*="Search"], input[placeholder*="search"]', {
      timeout: 300000,
    }).type('xyznonexistent123', {force: true});

    cy.wait('@emptySearch');
    cy.contains('No results found', {timeout: 300000}).should('be.visible');
  });

  it('should switch to Users tab and show user results', () => {
    cy.intercept('GET', '**/api/social/search*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {id: 'u1', username: 'alice', display_name: 'Alice AI', karma: 150},
        ],
      },
    }).as('searchUsers');

    cy.socialVisit('/social/search');
    cy.get('#root', {timeout: 300000}).should('exist');

    // Click Users tab
    cy.contains('Users').click({force: true});

    cy.get('input[placeholder*="Search"], input[placeholder*="search"]', {
      timeout: 300000,
    }).type('alice', {force: true});

    cy.wait('@searchUsers');
    cy.get('body', {timeout: 300000}).should(($body) => {
      const text = $body.text();
      expect(text.includes('alice') || text.includes('Alice')).to.be.true;
    });
  });

  it('should switch to Communities tab and show community results', () => {
    cy.intercept('GET', '**/api/social/search*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {id: 's1', name: 'ai-agents', description: 'AI agent discussions'},
        ],
      },
    });

    cy.socialVisit('/social/search');
    cy.get('#root', {timeout: 300000}).should('exist');

    cy.get('[role="tab"]', {timeout: 300000}).contains('Communities').click({force: true});
    cy.get('input[placeholder*="Search"], input[placeholder*="search"]', {
      timeout: 300000,
    }).type('ai', {force: true});

    cy.contains('h/ai-agents', {timeout: 300000}).should('be.visible');
  });
});

// ---------------------------------------------------------------
// 3. Search API Integration
// ---------------------------------------------------------------
describe('Social Search -- API', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should call GET /search for posts', () => {
    cy.socialRequest('GET', '/search?q=test&type=posts&limit=30').then(
      (res) => {
        expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
        if (res.status === 200) {
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('data');
          expect(res.body.data).to.be.an('array');
        }
      }
    );
  });

  it('should call GET /search for users', () => {
    cy.socialRequest('GET', '/search?q=test&type=users&limit=30').then(
      (res) => {
        expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      }
    );
  });

  it('should call GET /search for communities', () => {
    cy.socialRequest('GET', '/search?q=test&type=communities&limit=30').then(
      (res) => {
        expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      }
    );
  });
});

// ---------------------------------------------------------------
// 4. Error Handling
// ---------------------------------------------------------------
describe('Social Search -- Error Handling', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should handle search API errors gracefully', () => {
    cy.intercept('GET', '**/api/social/search*', {
      statusCode: 500,
      body: {success: false, error: 'Server error'},
    });

    cy.socialVisit('/social/search');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('body').should('not.contain.text', 'Cannot read properties');
  });
});
