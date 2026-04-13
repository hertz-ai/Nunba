/**
 * mindstory.cy.js — E2E tests for the Mindstory AI video generation page.
 *
 * Route: /social/mindstory
 *
 * MindstoryPage is a thin wrapper around the existing PupitCardContainer,
 * which fetches famous characters from mailerApi.getFamousCharacters() and
 * renders PupitCard components with VIDEO_GEN_URL video generation.
 *
 * Tests stub the character API and verify page rendering + navigation.
 */

const MOCK_CHARACTERS = [
  {
    image_name: 'Einstein',
    image_url: 'https://example.com/einstein.jpg',
    video_url: 'https://example.com/einstein.mp4',
    audio_url: 'https://example.com/einstein.wav',
  },
  {
    image_name: 'Shakespeare',
    image_url: 'https://example.com/shakespeare.jpg',
    video_url: 'https://example.com/shakespeare.mp4',
    audio_url: 'https://example.com/shakespeare.wav',
  },
];

describe('Mindstory Page', () => {
  before(() => {
    cy.socialAuth();
  });

  beforeEach(() => {
    // Stub the famous characters API
    cy.intercept('GET', '**/get_famous_character*', {
      statusCode: 200,
      body: MOCK_CHARACTERS,
    }).as('getCharacters');
  });

  it('renders the Mindstory page with header', () => {
    cy.socialVisit('/social/mindstory');
    cy.contains('Mindstory', {timeout: 300000}).should('be.visible');
    cy.contains('Create AI videos from any character').should('be.visible');
  });

  it('loads character cards from API', () => {
    cy.socialVisit('/social/mindstory');
    cy.wait('@getCharacters');
    cy.contains('Einstein', {timeout: 300000}).should('be.visible');
    cy.contains('Shakespeare').should('be.visible');
  });

  it('shows search input for filtering characters', () => {
    cy.socialVisit('/social/mindstory');
    cy.wait('@getCharacters');
    cy.get('.input_Search', {timeout: 300000}).should('be.visible');
  });

  it('filters characters by search term', () => {
    cy.socialVisit('/social/mindstory');
    cy.wait('@getCharacters');
    cy.get('.input_Search').type('ein', {force: true});
    cy.contains('Einstein').should('be.visible');
    cy.contains('Shakespeare').should('not.exist');
  });

  it('opens Create Your Video modal on card button click', () => {
    cy.socialVisit('/social/mindstory');
    cy.wait('@getCharacters');
    cy.contains('Create Your Video', {timeout: 300000}).first().click({force: true});
    cy.get('.modal', {timeout: 300000}).should('be.visible');
    cy.get('.inputmodal').should('be.visible');
  });

  it('validates minimum text length before submission', () => {
    cy.socialVisit('/social/mindstory');
    cy.wait('@getCharacters');
    cy.contains('Create Your Video').first().click({force: true});
    cy.get('.inputmodal').type('short', {force: true});
    cy.get('.submitButton').click({force: true});
    cy.contains('atleast 10 Character', {timeout: 300000}).should('be.visible');
  });

  it('is accessible from the sidebar navigation', () => {
    cy.socialVisit('/social');
    cy.contains('Mindstory', {timeout: 300000}).should('be.visible');
    cy.contains('Mindstory').click({force: true});
    cy.url().should('include', '/social/mindstory');
  });
});
