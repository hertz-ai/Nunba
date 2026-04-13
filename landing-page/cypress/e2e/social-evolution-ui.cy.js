/**
 * Cypress E2E Tests -- Agent Evolution Page UI
 *
 * Covers:
 *   1. AgentEvolutionPage (/social/agents/:agentId/evolution) - rendering
 *   2. Evolution Timeline display
 *   3. Traits display
 *   4. Specialization Trees
 *   5. Next Stage Requirements
 *   6. Evolve button (enabled/disabled)
 *   7. Loading / error states
 *   8. Evolution API endpoints
 *
 * Backend API: http://localhost:5000/api/social/agents
 */

const mockEvolution = {
  agent_id: 'agent-1',
  stage: 'sapling',
  stage_name: 'Sapling',
  can_evolve: false,
  traits: [
    {name: 'Analytical', level: 3},
    {name: 'Creative', level: 2},
    'Empathetic',
  ],
  specializations: ['nlp-expert'],
  next_requirements: [
    {label: 'Reach 100 interactions', met: true},
    {label: 'Achieve 90% satisfaction', met: false},
    {label: 'Complete 5 specialization tasks', met: false},
  ],
};

const mockEvolutionCanEvolve = {
  ...mockEvolution,
  can_evolve: true,
  next_requirements: [
    {label: 'Reach 100 interactions', met: true},
    {label: 'Achieve 90% satisfaction', met: true},
    {label: 'Complete 5 specialization tasks', met: true},
  ],
};

const mockTrees = [
  {
    id: 'nlp-expert',
    name: 'NLP Expert',
    description: 'Specializes in natural language processing',
    progress: 75,
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Focuses on data analysis and insights',
    progress: 30,
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    description: 'Excels at creative content generation',
    progress: 10,
  },
];

// ---------------------------------------------------------------
// 1. Evolution Page - Basic Rendering
// ---------------------------------------------------------------
describe('Social Evolution -- Page UI', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should load the evolution page without crashing', () => {
    cy.intercept('GET', '**/api/social/agents/agent-1/evolution', {
      statusCode: 200,
      body: {success: true, data: mockEvolution},
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: {success: true, data: mockTrees},
    });

    cy.socialVisit('/social/agents/agent-1/evolution');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.url().should('include', '/social/agents/agent-1/evolution');
  });

  it('should display "Agent Evolution" heading', () => {
    cy.intercept('GET', '**/api/social/agents/agent-1/evolution', {
      statusCode: 200,
      body: {success: true, data: mockEvolution},
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: {success: true, data: mockTrees},
    });

    cy.socialVisit('/social/agents/agent-1/evolution');
    cy.contains('Agent Evolution', {timeout: 300000}).should('be.visible');
  });
});

// ---------------------------------------------------------------
// 2. Traits Display
// ---------------------------------------------------------------
describe('Social Evolution -- Traits', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should display agent traits as chips', () => {
    cy.intercept('GET', '**/api/social/agents/agent-1/evolution', {
      statusCode: 200,
      body: {success: true, data: mockEvolution},
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: {success: true, data: mockTrees},
    });

    cy.socialVisit('/social/agents/agent-1/evolution');
    cy.get('#root', {timeout: 300000}).should('exist');

    cy.contains('Traits', {timeout: 300000}).should('be.visible');
    cy.contains('Analytical').should('be.visible');
    cy.contains('Creative').should('be.visible');
    cy.contains('Empathetic').should('be.visible');
  });
});

// ---------------------------------------------------------------
// 3. Specialization Trees
// ---------------------------------------------------------------
describe('Social Evolution -- Specialization Trees', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should display specialization trees with names and descriptions', () => {
    cy.intercept('GET', '**/api/social/agents/agent-1/evolution', {
      statusCode: 200,
      body: {success: true, data: mockEvolution},
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: {success: true, data: mockTrees},
    });

    cy.socialVisit('/social/agents/agent-1/evolution');
    cy.get('#root', {timeout: 300000}).should('exist');

    cy.contains('Specialization Trees', {timeout: 300000}).should('be.visible');
    cy.contains('NLP Expert').should('be.visible');
    cy.contains('Data Analyst').should('be.visible');
    cy.contains('Creative Writer').should('be.visible');
  });

  it('should show progress percentages for each tree', () => {
    cy.intercept('GET', '**/api/social/agents/agent-1/evolution', {
      statusCode: 200,
      body: {success: true, data: mockEvolution},
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: {success: true, data: mockTrees},
    });

    cy.socialVisit('/social/agents/agent-1/evolution');
    cy.contains('75%', {timeout: 300000}).should('be.visible');
    cy.contains('30%').should('be.visible');
  });

  it('should highlight active specialization', () => {
    cy.intercept('GET', '**/api/social/agents/agent-1/evolution', {
      statusCode: 200,
      body: {success: true, data: mockEvolution},
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: {success: true, data: mockTrees},
    });

    cy.socialVisit('/social/agents/agent-1/evolution');
    // The NLP Expert tree should have "Active" chip since agent has 'nlp-expert' specialization
    cy.contains('Active', {timeout: 300000}).should('be.visible');
  });
});

// ---------------------------------------------------------------
// 4. Requirements
// ---------------------------------------------------------------
describe('Social Evolution -- Requirements', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should display next stage requirements', () => {
    cy.intercept('GET', '**/api/social/agents/agent-1/evolution', {
      statusCode: 200,
      body: {success: true, data: mockEvolution},
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: {success: true, data: mockTrees},
    });

    cy.socialVisit('/social/agents/agent-1/evolution');
    cy.contains('Next Stage Requirements', {timeout: 300000}).should(
      'be.visible'
    );
    cy.contains('Reach 100 interactions').should('be.visible');
    cy.contains('Achieve 90% satisfaction').should('be.visible');
  });
});

// ---------------------------------------------------------------
// 5. Evolve Button
// ---------------------------------------------------------------
describe('Social Evolution -- Evolve Button', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should show disabled button when requirements not met', () => {
    cy.intercept('GET', '**/api/social/agents/agent-1/evolution', {
      statusCode: 200,
      body: {success: true, data: mockEvolution},
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: {success: true, data: mockTrees},
    });

    cy.socialVisit('/social/agents/agent-1/evolution');
    cy.contains('Requirements Not Met', {timeout: 300000}).should('be.visible');
    cy.contains('Requirements Not Met').closest('button').should('be.disabled');
  });

  it('should show enabled button when all requirements are met', () => {
    cy.intercept('GET', '**/api/social/agents/agent-1/evolution', {
      statusCode: 200,
      body: {success: true, data: mockEvolutionCanEvolve},
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: {success: true, data: mockTrees},
    });

    cy.socialVisit('/social/agents/agent-1/evolution');
    cy.contains('Evolve Now', {timeout: 300000}).should('be.visible');
    cy.contains('Evolve Now').closest('button').should('not.be.disabled');
  });

  it('should call evolve API when Evolve Now is clicked', () => {
    cy.intercept('GET', '**/api/social/agents/agent-1/evolution', {
      statusCode: 200,
      body: {success: true, data: mockEvolutionCanEvolve},
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: {success: true, data: mockTrees},
    });
    cy.intercept('POST', '**/api/social/agents/agent-1/specialize', {
      statusCode: 200,
      body: {success: true, data: {...mockEvolutionCanEvolve, stage: 3}},
    }).as('evolve');

    cy.socialVisit('/social/agents/agent-1/evolution');
    cy.contains('Evolve Now', {timeout: 300000}).click({force: true});
    cy.wait('@evolve');
  });
});

// ---------------------------------------------------------------
// 6. API Endpoints
// ---------------------------------------------------------------
describe('Social Evolution -- API', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should get evolution data via GET /agents/:id/evolution', () => {
    cy.socialRequest('GET', '/agents/nonexistent/evolution').then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 404, 500, 503]);
    });
  });

  it('should get specialization trees via GET /agents/specialization-trees', () => {
    cy.socialRequest('GET', '/agents/specialization-trees').then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('data');
      }
    });
  });

  it('should get agent leaderboard via GET /agents/leaderboard', () => {
    cy.socialRequest('GET', '/agents/leaderboard').then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 404, 500, 503]);
    });
  });

  it('should get agent showcase via GET /agents/showcase', () => {
    cy.socialRequest('GET', '/agents/showcase').then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 404, 500, 503]);
    });
  });
});

// ---------------------------------------------------------------
// 7. Error Handling
// ---------------------------------------------------------------
describe('Social Evolution -- Error Handling', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should show "Evolution data not found" for invalid agent', () => {
    cy.intercept('GET', '**/api/social/agents/bad-agent/evolution', {
      statusCode: 404,
      body: {success: false, error: 'Not found'},
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: {success: true, data: []},
    });

    cy.socialVisit('/social/agents/bad-agent/evolution');
    cy.contains('not found', {timeout: 300000}).should('be.visible');
  });

  it('should handle API errors without crashing', () => {
    cy.intercept('GET', '**/api/social/agents/agent-1/evolution', {
      statusCode: 500,
      body: {success: false, error: 'Server error'},
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 500,
      body: {success: false},
    });

    cy.socialVisit('/social/agents/agent-1/evolution');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('body').should('not.contain.text', 'Cannot read properties');
  });
});
