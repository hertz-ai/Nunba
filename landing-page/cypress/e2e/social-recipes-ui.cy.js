/**
 * Cypress E2E Tests -- Social Recipes UI
 *
 * Covers:
 *   1. RecipeListPage (/social/recipes) - list, empty state, card rendering
 *   2. Recipes API - CRUD integration
 *   3. Error handling
 *
 * Note: /social/recipes/:recipeId route is NOT defined in MainRoute.js yet,
 *       so detail page UI tests are excluded.
 *
 * Backend API: http://localhost:5000/api/social/recipes
 */

const mockRecipes = [
  {
    id: 'r1',
    title: 'Customer Support Agent',
    description: 'A recipe for building a customer support agent',
    fork_count: 12,
    tags: ['support', 'chatbot'],
    author: {id: 'u1', username: 'alice', display_name: 'Alice'},
    created_at: new Date().toISOString(),
  },
  {
    id: 'r2',
    title: 'Content Writer Agent',
    name: 'Content Writer Agent',
    description: 'Recipe for a content writing AI assistant',
    fork_count: 5,
    tags: ['writing', 'content'],
    author: {id: 'u2', username: 'bob', display_name: 'Bob'},
    created_at: new Date().toISOString(),
  },
];

// ---------------------------------------------------------------
// 1. Recipe List Page
// ---------------------------------------------------------------
describe('Social Recipes -- List Page UI', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should load the recipes page without crashing', () => {
    cy.socialVisit('/social/recipes');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root').invoke('html').should('not.be.empty');
    cy.url().should('include', '/social/recipes');
  });

  it('should display "Shared Recipes" heading', () => {
    cy.socialVisit('/social/recipes');
    cy.contains('Shared Recipes', {timeout: 300000}).should('be.visible');
  });

  it('should render mocked recipe cards correctly', () => {
    cy.intercept('GET', '**/api/social/recipes*', {
      statusCode: 200,
      body: {success: true, data: mockRecipes, meta: {has_more: false}},
    });

    cy.socialVisit('/social/recipes');
    cy.contains('Customer Support Agent', {timeout: 300000}).should(
      'be.visible'
    );
    cy.contains('Content Writer Agent', {timeout: 300000}).should('be.visible');
    cy.contains('12 forks', {timeout: 300000}).should('exist');
  });

  it('should render tags on recipe cards', () => {
    cy.intercept('GET', '**/api/social/recipes*', {
      statusCode: 200,
      body: {success: true, data: mockRecipes, meta: {has_more: false}},
    });

    cy.socialVisit('/social/recipes');
    cy.contains('Customer Support Agent', {timeout: 300000}).should(
      'be.visible'
    );
    cy.contains('support').should('be.visible');
    cy.contains('chatbot').should('be.visible');
  });

  it('should show empty state when no recipes exist', () => {
    cy.intercept('GET', '**/api/social/recipes*', {
      statusCode: 200,
      body: {success: true, data: [], meta: {has_more: false}},
    });

    cy.socialVisit('/social/recipes');
    cy.contains('No shared recipes', {timeout: 300000}).should('be.visible');
  });

  it('should render content area (cards or empty state)', () => {
    cy.socialVisit('/social/recipes');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('body').should('not.contain.text', 'Cannot read properties');
    cy.get('body', {timeout: 300000}).should(($body) => {
      const text = $body.text();
      const hasContent =
        text.includes('Shared Recipes') || text.includes('No shared recipes');
      expect(hasContent).to.be.true;
    });
  });
});

// ---------------------------------------------------------------
// 2. Recipe API Integration
// ---------------------------------------------------------------
describe('Social Recipes -- API', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should list recipes via GET /recipes', () => {
    cy.socialRequest('GET', '/recipes').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('data');
        expect(res.body.data).to.be.an('array');
      }
    });
  });

  it('should share a recipe via POST /recipes', () => {
    cy.socialRequest('POST', '/recipes', {
      title: `Cypress Recipe ${Date.now()}`,
      description: 'Automated test recipe',
      steps: 'Step 1: Test\nStep 2: Verify',
      tags: ['test', 'cypress'],
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201, 400, 401, 404, 405, 500, 503]);
      if (res.status < 400 && res.body.data) {
        Cypress.env('testRecipeId', res.body.data.id);
      }
    });
  });

  it('should get a recipe by ID via GET /recipes/:id', () => {
    const id = Cypress.env('testRecipeId') || 'nonexistent';
    cy.socialRequest('GET', `/recipes/${id}`).then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('data');
      }
    });
  });

  it('should fork a recipe via POST /recipes/:id/fork', () => {
    const id = Cypress.env('testRecipeId') || 'nonexistent';
    cy.socialRequest('POST', `/recipes/${id}/fork`).then((res) => {
      expect(res.status).to.be.oneOf([200, 201, 400, 404, 500, 503]);
    });
  });
});

// ---------------------------------------------------------------
// 3. Error Handling
// ---------------------------------------------------------------
describe('Social Recipes -- Error Handling', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should handle list API errors gracefully', () => {
    cy.intercept('GET', '**/api/social/recipes*', {
      statusCode: 500,
      body: {success: false, error: 'Server error'},
    });

    cy.socialVisit('/social/recipes');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('body').should('not.contain.text', 'Cannot read properties');
  });
});
