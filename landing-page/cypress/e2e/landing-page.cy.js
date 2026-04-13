/// <reference types="cypress" />

describe('Landing Page Renders', () => {
  beforeEach(() => {
    cy.visit('/', {timeout: 60000, failOnStatusCode: false});
  });

  it('has the correct title', () => {
    cy.title().should('contain', 'Hevolve');
  });

  it('renders the React root with content', () => {
    cy.get('#root', {timeout: 300000}).invoke('html').should('not.be.empty');
  });

  it('has visible text content', () => {
    cy.get('#root', {timeout: 300000}).invoke('text').should('not.be.empty');
  });

  it('loads MUI components', () => {
    cy.get('[class*="Mui"]', {timeout: 300000}).should(
      'have.length.greaterThan',
      0
    );
  });

  it('has interactive buttons', () => {
    cy.get('button', {timeout: 300000}).should('have.length.greaterThan', 0);
  });
});
