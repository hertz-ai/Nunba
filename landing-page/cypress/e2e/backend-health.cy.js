/// <reference types="cypress" />

describe('Backend Health & API', () => {
  // Backend runs on port 5000
  const API = 'http://localhost:5000';

  it('backend health endpoint returns ok', () => {
    cy.request({
      method: 'GET',
      url: `${API}/health`,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(200);
      // status may be 'error' when llama.cpp is not running; accept both
      expect(res.body).to.have.property('status').and.be.oneOf(['ok', 'error']);
      expect(res.body).to.have.property('nunba_version');
      expect(res.body).to.have.property('llama_health');
    });
  });

  it('prompts endpoint returns correct format with prompts array', () => {
    cy.request('GET', `${API}/prompts`).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('prompts');
      expect(res.body.prompts).to.be.an('array');
      expect(res.body.prompts.length).to.be.greaterThan(0);
    });
  });

  it('each prompt has required fields (id, name, type, available)', () => {
    cy.request('GET', `${API}/prompts`).then((res) => {
      res.body.prompts.forEach((prompt) => {
        expect(prompt).to.have.property('id');
        expect(prompt).to.have.property('name');
        expect(prompt).to.have.property('type');
        expect(prompt).to.have.property('available');
      });
    });
  });

  it('chat endpoint accepts POST and returns valid JSON', () => {
    cy.request({
      method: 'POST',
      url: `${API}/chat`,
      body: {
        text: 'hello',
        user_id: 'cypress-test-user',
        agent_id: 'local_assistant',
        agent_type: 'local',
        conversation_id: 'cypress-e2e-test',
        video_req: false,
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('agent_id');
      expect(res.body).to.have.property('agent_type');
      expect(res.body).to.satisfy(
        (body) => body.success === true || body.error !== undefined
      );
    });
  });
});
