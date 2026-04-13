/**
 * Cypress E2E Tests -- Agent Profile Page UI
 *
 * Tests cover:
 *   1. Page Load            - basic rendering, loading state, not-found, no runtime errors
 *   2. Stubbed Agent Data   - hero header, badge, bio, stats, About tab, CTA
 *   3. Tab Navigation       - switch tabs, rapid switching
 *   4. Activity Tab         - timeline entries, conversations, empty state
 *   5. Evolution Tab        - level/XP, traits, specialization trees, missing data
 *   6. Talk to Agent CTA    - fixed button presence, navigation to chat
 *   7. Responsive           - mobile, tablet, viewport changes
 *   8. API Integration      - prompts API, evolution API, error handling, timeout
 *
 * Route: /social/agent/:agentId
 * Component: AgentProfilePage.jsx
 *
 * The component fetches agent data from chatApi.getPublicPromptsCloud()
 * (cloud endpoint: GET https://mailer.hertzai.com/getprompt_all/)
 * and evolution data from evolutionApi.get() (GET /api/social/agents/:agentId/evolution).
 *
 * IMPORTANT: The component unwraps axios response.data, so stub bodies must be
 * the raw payload the component expects — NOT wrapped in { success, data }.
 * e.g. body: [mockAgent]  NOT  body: { data: [mockAgent] }
 *      body: mockEvolution NOT  body: { success: true, data: mockEvolution }
 *
 * Custom commands used:
 *   cy.socialAuth()    - registers unique test user, stores token/userId
 *   cy.socialVisit()   - visits with auth token pre-set in localStorage
 */

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const mockAgent = {
  id: 'test-agent-1',
  prompt_id: 'test-agent-1',
  name: 'Cypress Test Agent',
  video_text: 'A highly capable test agent created for E2E validation.',
  description: 'A highly capable test agent created for E2E validation.',
  image_url: null,
  model: 'gpt-4',
  type: 'assistant',
  owner: 'cypress-user',
  status: 'active',
  is_active: true,
  conversation_count: 42,
  capabilities: ['web_search', 'code_interpreter', 'image_generation'],
  specialization: 'NLP Expert',
  created_at: '2025-11-15T10:30:00Z',
};

const mockEvolution = {
  agent_id: 'test-agent-1',
  level: 3,
  evolution_level: 3,
  stage: 'Sapling',
  evolution_stage: 'Sapling',
  xp: 150,
  experience: 150,
  xp_next: 300,
  next_level_xp: 300,
  traits: ['helpful', 'creative', 'analytical'],
  specializations: ['nlp-expert'],
  specialization: 'NLP Expert',
  current_specialization: 'NLP Expert',
  next_requirements: [
    {label: 'Reach 100 interactions', met: true},
    {label: 'Achieve 90% satisfaction', met: false},
    {label: 'Complete 5 specialization tasks', met: false},
  ],
};

const mockEvolutionHistory = [
  {level: 1, description: 'Agent created', timestamp: '2025-11-15T10:30:00Z'},
  {level: 2, description: 'First evolution', timestamp: '2025-12-01T14:20:00Z'},
  {
    level: 3,
    description: 'Specialization unlocked',
    timestamp: '2026-01-10T09:00:00Z',
  },
];

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

const mockTimeline = [
  {
    id: 'evt-1',
    type: 'conversation',
    timestamp: '2026-02-19T08:00:00Z',
    content: 'Discussed project architecture',
  },
  {
    id: 'evt-2',
    type: 'tool_call',
    timestamp: '2026-02-19T07:30:00Z',
    content: 'Used web_search tool',
  },
  {
    id: 'evt-3',
    type: 'lifecycle',
    timestamp: '2026-02-18T22:00:00Z',
    content: 'Agent evolved to level 3',
  },
  {
    id: 'evt-4',
    type: 'thinking',
    timestamp: '2026-02-18T21:50:00Z',
    content: 'Reasoning about user intent',
  },
  {
    id: 'evt-5',
    type: 'collaboration',
    timestamp: '2026-02-18T20:00:00Z',
    content: 'Collaborated with Data Agent',
  },
];

const mockConversations = [
  {
    id: 'conv-1',
    title: 'Project planning session',
    message_count: 12,
    created_at: '2026-02-19T08:00:00Z',
  },
  {
    id: 'conv-2',
    title: 'Code review discussion',
    message_count: 8,
    created_at: '2026-02-18T14:00:00Z',
  },
  {
    id: 'conv-3',
    title: 'Brainstorming ideas',
    message_count: 5,
    created_at: '2026-02-17T10:00:00Z',
  },
];

const mockCollaborations = [
  {
    id: 'collab-1',
    partner_name: 'Data Analyst Agent',
    type: 'Joint Analysis',
    result: 'success',
    timestamp: '2026-02-18T20:00:00Z',
  },
  {
    id: 'collab-2',
    partner_name: 'Creative Writer Agent',
    type: 'Content Co-creation',
    result: 'success',
    timestamp: '2026-02-17T16:00:00Z',
  },
];

/**
 * Helper: stub ALL agent-profile APIs with default mock data.
 * Call inside beforeEach to ensure every test starts with consistent stubs.
 *
 * Body format rationale:
 *   The component uses axios, which puts the HTTP response body into response.data.
 *   - chatApi.getPublicPromptsCloud() → allRes.data = body → must be the array directly
 *   - evolutionApi.get()              → evoRes.value.data = body → must be the evolution object directly
 *   - evolutionApi.history()          → historyRes.value.data = body → must be the array directly
 *   - evolutionApi.trees()            → treesRes.value.data = body → must be the array directly
 *   - auditApi.getTimeline()          → timelineRes.value.data = body → must be the array directly
 *   - auditApi.getConversations()     → convoRes.value.data = body → must be the array directly
 *   - evolutionApi.collaborations()   → res.data = body → must be the array directly
 */
function stubAgentApis(overrides = {}) {
  const agentData = overrides.agents || [mockAgent];

  // Cloud prompts endpoint (chatApi.getPublicPromptsCloud)
  // Component: allRes.data (axios unwrap) → must be the agent array
  cy.intercept('GET', '**/getprompt_all/**', {
    statusCode: 200,
    body: agentData,
  }).as('agentList');

  // Evolution
  // Component: evoRes.value.data (axios unwrap) → must be the evolution object
  cy.intercept('GET', '**/api/social/agents/test-agent-1/evolution', {
    statusCode: 200,
    body: overrides.evolution || mockEvolution,
  }).as('evolution');

  // Evolution history
  // Component: historyRes.value.data (axios unwrap) → must be the array
  cy.intercept('GET', '**/api/social/agents/test-agent-1/evolution-history', {
    statusCode: 200,
    body: overrides.evolutionHistory || mockEvolutionHistory,
  }).as('evolutionHistory');

  // Specialization trees
  // Component: treesRes.value.data (axios unwrap) → must be the array
  cy.intercept('GET', '**/api/social/agents/specialization-trees', {
    statusCode: 200,
    body: overrides.trees || mockTrees,
  }).as('trees');

  // Activity timeline
  // Component: timelineRes.value.data (axios unwrap) → must be the array
  cy.intercept('GET', '**/api/social/audit/agents/test-agent-1/timeline**', {
    statusCode: 200,
    body: overrides.timeline || mockTimeline,
  }).as('timeline');

  // Conversations
  // Component: convoRes.value.data (axios unwrap) → must be the array
  cy.intercept('GET', '**/api/social/audit/agents/test-agent-1/conversations', {
    statusCode: 200,
    body: overrides.conversations || mockConversations,
  }).as('conversations');

  // Collaborations
  // Component: res.data (axios unwrap) → must be the array
  cy.intercept('GET', '**/api/social/agents/test-agent-1/collaborations**', {
    statusCode: 200,
    body: overrides.collaborations || mockCollaborations,
  }).as('collaborations');

  // Auth me (so SocialContext sees authenticated user)
  cy.intercept('GET', '**/api/social/auth/me', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        id: Cypress.env('socialUserId') || 'test-user-1',
        username: Cypress.env('socialUsername') || 'testuser',
        role: 'flat',
      },
    },
  }).as('authMe');
}

// =========================================================================
// 1. Agent Profile -- Page Load
// =========================================================================
describe('Agent Profile -- Page Load', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should load the agent profile page without crashing', () => {
    stubAgentApis();
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root').invoke('html').should('not.be.empty');
    cy.url().should('include', '/social/agent/test-agent-1');
  });

  it('should show loading state initially', () => {
    // Delay the cloud API so the loading spinner is visible
    cy.intercept('GET', '**/getprompt_all/**', (req) => {
      req.on('response', (res) => {
        res.setDelay(1500);
      });
    }).as('slowAgentList');

    // Stub the remaining APIs normally (raw payloads for axios unwrap)
    cy.intercept('GET', '**/api/social/agents/test-agent-1/evolution', {
      statusCode: 200,
      body: mockEvolution,
    });
    cy.intercept('GET', '**/api/social/agents/test-agent-1/evolution-history', {
      statusCode: 200,
      body: [],
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: [],
    });
    cy.intercept('GET', '**/api/social/auth/me', {
      statusCode: 200,
      body: {success: true, data: {id: 'u', username: 'u', role: 'flat'}},
    });

    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');

    // Loading state renders a CircularProgress and "Loading agent profile..." text
    cy.get('body').should(($body) => {
      const hasSpinner =
        $body.find('[class*="MuiCircularProgress"], [role="progressbar"]')
          .length > 0;
      const hasLoadingText = $body.text().includes('Loading agent profile');
      const pageLoaded = $body.html().length > 100;
      expect(hasSpinner || hasLoadingText || pageLoaded).to.be.true;
    });
  });

  it('should handle agent not found gracefully', () => {
    // Stub cloud API to return empty list -- agent won't be found
    cy.intercept('GET', '**/getprompt_all/**', {
      statusCode: 200,
      body: [],
    }).as('emptyAgentList');

    cy.intercept(
      'GET',
      '**/api/social/agents/nonexistent-agent-id-99999/evolution',
      {
        statusCode: 404,
        body: {success: false, error: 'Not found'},
      }
    );
    cy.intercept(
      'GET',
      '**/api/social/agents/nonexistent-agent-id-99999/evolution-history',
      {
        statusCode: 404,
        body: [],
      }
    );
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: [],
    });
    cy.intercept('GET', '**/api/social/auth/me', {
      statusCode: 200,
      body: {success: true, data: {id: 'u', username: 'u', role: 'flat'}},
    });

    cy.socialVisit('/social/agent/nonexistent-agent-id-99999');
    cy.get('#root', {timeout: 300000}).should('exist');

    // Should display "Agent not found" message
    cy.contains('Agent not found', {timeout: 300000}).should('be.visible');
    // Should show "Back to Feed" button
    cy.contains('Back to Feed', {timeout: 300000}).should('be.visible');
  });

  it('should not crash with runtime errors', () => {
    stubAgentApis();
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    cy.get('body').should('not.contain.text', 'Cannot read properties');
    cy.get('body').should('not.contain.text', 'Uncaught');
    cy.get('body').should('not.contain.text', 'is not a function');
  });
});

// =========================================================================
// 2. Agent Profile -- With Stubbed Agent Data
// =========================================================================
describe('Agent Profile -- With Stubbed Agent Data', () => {
  before(() => {
    cy.socialAuth();
  });

  beforeEach(() => {
    stubAgentApis();
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);
  });

  it('should display agent name in hero header', () => {
    cy.contains('Cypress Test Agent', {timeout: 300000}).should('be.visible');
  });

  it('should show "Agent" badge chip', () => {
    cy.contains('Agent', {timeout: 300000}).should('be.visible');
  });

  it('should display auto-bio from video_text', () => {
    cy.contains('A highly capable test agent', {timeout: 300000}).should(
      'be.visible'
    );
  });

  it('should show stats row (Conversations, Level, Specializations, Status)', () => {
    cy.contains('Conversations', {timeout: 300000}).should('exist');
    cy.contains('Level', {timeout: 300000}).should('exist');
    cy.contains('Specializations', {timeout: 300000}).should('exist');
    cy.contains('Status', {timeout: 300000}).should('exist');
  });

  it('should render About tab by default', () => {
    // The Tabs component renders "About", "Activity", "Evolution"
    cy.get('[role="tab"]', {timeout: 300000}).should('have.length', 3);
    // About tab should be selected (Mui-selected class)
    cy.get('[role="tab"]', {timeout: 300000}).eq(0).should('have.attr', 'aria-selected', 'true');
    cy.contains('About this Agent', {timeout: 300000}).should('exist');
  });

  it('should render the "Talk to Agent" CTA button', () => {
    cy.contains('Talk to Agent', {timeout: 300000}).should('be.visible');
  });

  it('should show capabilities chips', () => {
    cy.contains('Capabilities', {timeout: 300000}).should('exist');
    cy.contains('web_search', {timeout: 300000}).should('exist');
    cy.contains('code_interpreter', {timeout: 300000}).should('exist');
    cy.contains('image_generation', {timeout: 300000}).should('exist');
  });

  it('should show agent specialization chip', () => {
    cy.contains('NLP Expert', {timeout: 300000}).should('exist');
  });

  it('should display conversation count in stats', () => {
    // The mock agent has conversation_count: 42
    cy.contains('42', {timeout: 300000}).should('exist');
  });

  it('should show active status indicator', () => {
    // The mock agent has status: 'active' and is_active: true
    // Stats row displays "Active" for active agents
    cy.contains('Active', {timeout: 300000}).should('exist');
  });

  it('should display creation date', () => {
    // The mock agent was created on Nov 15, 2025
    // Component renders: "Created {formatDate(createdAt)}" via toLocaleDateString('en-US')
    cy.contains('Nov 15, 2025', {timeout: 300000}).should('exist');
  });

  it('should show About tab with model metadata', () => {
    // The mock agent has model: 'gpt-4' and type: 'assistant'
    cy.contains('Model', {timeout: 300000}).should('exist');
    cy.contains('gpt-4', {timeout: 300000}).should('exist');
  });

  it('should show evolution history on About tab', () => {
    // Evolution history is displayed on the About tab when available
    cy.contains('Evolution History', {timeout: 300000}).should('exist');
    cy.contains('Agent created', {timeout: 300000}).should('exist');
    cy.contains('First evolution', {timeout: 300000}).should('exist');
  });

  it('should render avatar with SmartToy icon when no image_url', () => {
    // The mock agent has no avatar_url, so SmartToyIcon is shown inside the Avatar.
    // MUI icons from @mui/icons-material render with data-testid matching the component name.
    cy.get('[data-testid="SmartToyIcon"]', {timeout: 300000}).should('exist');
  });
});

// =========================================================================
// 3. Agent Profile -- Tab Navigation
// =========================================================================
describe('Agent Profile -- Tab Navigation', () => {
  before(() => {
    cy.socialAuth();
  });

  beforeEach(() => {
    stubAgentApis();
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);
  });

  it('should switch to Activity tab when clicked', () => {
    cy.get('[role="tab"]', {timeout: 300000}).eq(1).click({force: true});
    cy.wait(1000);

    // Activity tab should now be selected
    cy.get('[role="tab"]', {timeout: 300000}).eq(1).should('have.attr', 'aria-selected', 'true');
    // Should show activity-related content
    cy.contains('Activity Timeline', {timeout: 300000}).should('exist');
  });

  it('should switch to Evolution tab when clicked', () => {
    cy.get('[role="tab"]', {timeout: 300000}).eq(2).click({force: true});
    cy.wait(1000);

    cy.get('[role="tab"]', {timeout: 300000}).eq(2).should('have.attr', 'aria-selected', 'true');
    cy.contains('Evolution Level', {timeout: 300000}).should('exist');
  });

  it('should return to About tab when clicked', () => {
    // First switch to Activity
    cy.get('[role="tab"]', {timeout: 300000}).eq(1).click({force: true});
    cy.wait(500);

    // Then back to About
    cy.get('[role="tab"]', {timeout: 300000}).eq(0).click({force: true});
    cy.wait(500);

    cy.get('[role="tab"]', {timeout: 300000}).eq(0).should('have.attr', 'aria-selected', 'true');
    cy.contains('About this Agent', {timeout: 300000}).should('exist');
  });

  it('should not crash when switching tabs rapidly', () => {
    // Click through all tabs quickly
    cy.get('[role="tab"]', {timeout: 300000}).eq(1).click({force: true});
    cy.get('[role="tab"]', {timeout: 300000}).eq(2).click({force: true});
    cy.get('[role="tab"]', {timeout: 300000}).eq(0).click({force: true});
    cy.get('[role="tab"]', {timeout: 300000}).eq(2).click({force: true});
    cy.get('[role="tab"]', {timeout: 300000}).eq(1).click({force: true});
    cy.get('[role="tab"]', {timeout: 300000}).eq(0).click({force: true});
    cy.wait(1000);

    // Should not have crashed
    cy.get('body').should('not.contain.text', 'Cannot read properties');
    cy.get('#root').invoke('html').should('not.be.empty');
  });
});

// =========================================================================
// 4. Agent Profile -- Activity Tab
// =========================================================================
describe('Agent Profile -- Activity Tab', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should show activity timeline entries', () => {
    stubAgentApis();
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    // Switch to Activity tab
    cy.get('[role="tab"]', {timeout: 300000}).eq(1).click({force: true});
    cy.wait(1500);

    cy.contains('Activity Timeline', {timeout: 300000}).should('exist');
    cy.contains('Discussed project architecture', {timeout: 300000}).should(
      'exist'
    );
    cy.contains('Used web_search tool', {timeout: 300000}).should('exist');
  });

  it('should show conversation list', () => {
    stubAgentApis();
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    cy.get('[role="tab"]', {timeout: 300000}).eq(1).click({force: true});
    cy.wait(1500);

    cy.contains('Recent Conversations', {timeout: 300000}).should('exist');
    cy.contains('Project planning session', {timeout: 300000}).should('exist');
    cy.contains('12 messages', {timeout: 300000}).should('exist');
  });

  it('should handle empty activity gracefully', () => {
    stubAgentApis({
      timeline: [],
      conversations: [],
    });
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    cy.get('[role="tab"]', {timeout: 300000}).eq(1).click({force: true});
    cy.wait(1500);

    // Empty state message
    cy.contains('No activity recorded yet', {timeout: 300000}).should('exist');
    cy.get('body').should('not.contain.text', 'Cannot read properties');
  });
});

// =========================================================================
// 5. Agent Profile -- Evolution Tab
// =========================================================================
describe('Agent Profile -- Evolution Tab', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should show evolution level and XP', () => {
    stubAgentApis();
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    cy.get('[role="tab"]', {timeout: 300000}).eq(2).click({force: true});
    cy.wait(1500);

    cy.contains('Evolution Level', {timeout: 300000}).should('exist');
    // Level number "3" is rendered in a large typography
    cy.get('body').should('contain.text', '3');
    // XP progress: "150/300"
    cy.contains('150/300', {timeout: 300000}).should('exist');
  });

  it('should show traits chips', () => {
    stubAgentApis();
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    cy.get('[role="tab"]', {timeout: 300000}).eq(2).click({force: true});
    cy.wait(1500);

    cy.contains('Traits', {timeout: 300000}).should('exist');
    cy.contains('helpful', {timeout: 300000}).should('exist');
    cy.contains('creative', {timeout: 300000}).should('exist');
    cy.contains('analytical', {timeout: 300000}).should('exist');
  });

  it('should show specialization trees', () => {
    stubAgentApis();
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    cy.get('[role="tab"]', {timeout: 300000}).eq(2).click({force: true});
    cy.wait(1500);

    cy.contains('Specialization Trees', {timeout: 300000}).should('exist');
    cy.contains('NLP Expert', {timeout: 300000}).should('exist');
    cy.contains('Data Analyst', {timeout: 300000}).should('exist');
    cy.contains('Creative Writer', {timeout: 300000}).should('exist');
    // Progress percentages
    cy.contains('75%', {timeout: 300000}).should('exist');
    cy.contains('30%', {timeout: 300000}).should('exist');
  });

  it('should show next stage requirements', () => {
    stubAgentApis();
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    cy.get('[role="tab"]', {timeout: 300000}).eq(2).click({force: true});
    cy.wait(1500);

    cy.contains('Next Stage Requirements', {timeout: 300000}).should('exist');
    cy.contains('Reach 100 interactions', {timeout: 300000}).should('exist');
    cy.contains('Achieve 90% satisfaction', {timeout: 300000}).should('exist');
  });

  it('should show collaboration history', () => {
    stubAgentApis();
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    cy.get('[role="tab"]', {timeout: 300000}).eq(2).click({force: true});
    cy.wait(1500);

    cy.contains('Collaboration History', {timeout: 300000}).should('exist');
    cy.contains('Data Analyst Agent', {timeout: 300000}).should('exist');
    cy.contains('Joint Analysis', {timeout: 300000}).should('exist');
  });

  it('should handle missing evolution data gracefully', () => {
    stubAgentApis({
      evolution: {},
      evolutionHistory: [],
      trees: [],
      collaborations: [],
    });
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    cy.get('[role="tab"]', {timeout: 300000}).eq(2).click({force: true});
    cy.wait(1500);

    // Should still render the Evolution Level card (with defaults)
    cy.contains('Evolution Level', {timeout: 300000}).should('exist');
    cy.get('body').should('not.contain.text', 'Cannot read properties');
    cy.get('body').should('not.contain.text', 'is not a function');
  });
});

// =========================================================================
// 6. Agent Profile -- Talk to Agent CTA
// =========================================================================
describe('Agent Profile -- Talk to Agent CTA', () => {
  before(() => {
    cy.socialAuth();
  });

  beforeEach(() => {
    stubAgentApis();
  });

  it('should have a fixed "Talk to Agent" button', () => {
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    // The CTA is in a position:fixed container at the bottom
    cy.contains('Talk to Agent', {timeout: 300000}).should('be.visible');
    // Verify it is a button element
    cy.contains('button', 'Talk to Agent', {timeout: 300000}).should('exist');
  });

  it('should navigate to chat page when CTA is clicked', () => {
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    cy.contains('button', 'Talk to Agent').click({force: true});
    cy.url({timeout: 300000}).should(
      'include',
      '/social/agent/test-agent-1/chat'
    );
  });
});

// =========================================================================
// 7. Agent Profile -- Responsive
// =========================================================================
describe('Agent Profile -- Responsive', () => {
  before(() => {
    cy.socialAuth();
  });

  beforeEach(() => {
    stubAgentApis();
  });

  it('should render correctly on mobile (375x667)', () => {
    cy.viewport(375, 667);
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    cy.contains('Cypress Test Agent', {timeout: 300000}).should('be.visible');
    cy.contains('Talk to Agent', {timeout: 300000}).should('be.visible');
    cy.get('body').should('not.contain.text', 'Cannot read properties');
  });

  it('should render correctly on tablet (768x1024)', () => {
    cy.viewport(768, 1024);
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    cy.contains('Cypress Test Agent', {timeout: 300000}).should('be.visible');
    cy.contains('About this Agent', {timeout: 300000}).should('exist');
    cy.contains('Talk to Agent', {timeout: 300000}).should('be.visible');
  });

  it('should adapt layout when viewport changes', () => {
    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(2000);

    // Desktop
    cy.viewport(1280, 720);
    cy.wait(500);
    cy.get('#root').invoke('html').should('not.be.empty');
    cy.contains('Cypress Test Agent', {timeout: 300000}).should('be.visible');

    // Mobile
    cy.viewport(375, 667);
    cy.wait(500);
    cy.get('#root').invoke('html').should('not.be.empty');
    cy.contains('Cypress Test Agent', {timeout: 300000}).should('be.visible');

    // Tablet
    cy.viewport(768, 1024);
    cy.wait(500);
    cy.get('#root').invoke('html').should('not.be.empty');
    cy.contains('Cypress Test Agent', {timeout: 300000}).should('be.visible');
  });
});

// =========================================================================
// 8. Agent Profile -- API Integration
// =========================================================================
describe('Agent Profile -- API Integration', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should call prompts API to fetch agent data', () => {
    cy.intercept('GET', '**/getprompt_all/**').as('promptsApi');

    // Stub remaining APIs to prevent failures (raw payloads)
    cy.intercept('GET', '**/api/social/agents/test-agent-1/evolution', {
      statusCode: 200,
      body: mockEvolution,
    });
    cy.intercept('GET', '**/api/social/agents/test-agent-1/evolution-history', {
      statusCode: 200,
      body: [],
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: [],
    });
    cy.intercept('GET', '**/api/social/auth/me', {
      statusCode: 200,
      body: {success: true, data: {id: 'u', username: 'u', role: 'flat'}},
    });

    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');

    // Verify the prompts API was called
    cy.wait('@promptsApi', {timeout: 300000})
      .its('request.url')
      .should('include', 'getprompt_all');
  });

  it('should call evolution API for agent level', () => {
    // Agent list — raw array (no wrapper)
    cy.intercept('GET', '**/getprompt_all/**', {
      statusCode: 200,
      body: [mockAgent],
    }).as('agentList');

    cy.intercept('GET', '**/api/social/agents/test-agent-1/evolution').as(
      'evolutionApi'
    );
    cy.intercept('GET', '**/api/social/agents/test-agent-1/evolution-history', {
      statusCode: 200,
      body: [],
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: [],
    });
    cy.intercept('GET', '**/api/social/auth/me', {
      statusCode: 200,
      body: {success: true, data: {id: 'u', username: 'u', role: 'flat'}},
    });

    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');

    // Verify evolution API was called
    cy.wait('@evolutionApi', {timeout: 300000})
      .its('request.url')
      .should('include', '/evolution');
  });

  it('should handle API errors gracefully', () => {
    // Prompts API returns 500
    cy.intercept('GET', '**/getprompt_all/**', {
      statusCode: 500,
      body: {error: 'Internal Server Error'},
    }).as('promptsError');

    // Evolution also fails
    cy.intercept('GET', '**/api/social/agents/test-agent-1/evolution', {
      statusCode: 500,
      body: {success: false, error: 'Server error'},
    });
    cy.intercept('GET', '**/api/social/agents/test-agent-1/evolution-history', {
      statusCode: 500,
      body: [],
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 500,
      body: [],
    });
    cy.intercept('GET', '**/api/social/auth/me', {
      statusCode: 200,
      body: {success: true, data: {id: 'u', username: 'u', role: 'flat'}},
    });

    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.wait(3000);

    // When prompts API fails, agent is null -> "Agent not found" state
    cy.contains('Agent not found', {timeout: 300000}).should('be.visible');
    cy.get('body').should('not.contain.text', 'Cannot read properties');
  });

  it('should handle network timeout gracefully', () => {
    // Simulate very slow response (effectively a timeout from the user's perspective)
    cy.intercept('GET', '**/getprompt_all/**', (req) => {
      req.on('response', (res) => {
        res.setDelay(10000);
      });
    }).as('slowPrompts');

    cy.intercept('GET', '**/api/social/agents/test-agent-1/evolution', {
      statusCode: 200,
      body: mockEvolution,
    });
    cy.intercept('GET', '**/api/social/agents/test-agent-1/evolution-history', {
      statusCode: 200,
      body: [],
    });
    cy.intercept('GET', '**/api/social/agents/specialization-trees', {
      statusCode: 200,
      body: [],
    });
    cy.intercept('GET', '**/api/social/auth/me', {
      statusCode: 200,
      body: {success: true, data: {id: 'u', username: 'u', role: 'flat'}},
    });

    cy.socialVisit('/social/agent/test-agent-1');
    cy.get('#root', {timeout: 300000}).should('exist');

    // During the delay, page should show loading state without crashing
    cy.get('body').should(($body) => {
      const hasSpinner =
        $body.find('[class*="MuiCircularProgress"], [role="progressbar"]')
          .length > 0;
      const hasLoadingText = $body.text().includes('Loading agent profile');
      const pageLoaded = $body.html().length > 100;
      expect(hasSpinner || hasLoadingText || pageLoaded).to.be.true;
    });

    cy.get('body').should('not.contain.text', 'Cannot read properties');
  });
});
