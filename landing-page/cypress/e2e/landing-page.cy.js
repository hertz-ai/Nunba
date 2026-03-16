/// <reference types="cypress" />

describe('Landing Page Renders', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('has the correct title', () => {
    cy.title().should('contain', 'Hevolve');
  });

  it('renders the React root with content', () => {
    cy.get('#root', {timeout: 20000}).invoke('html').should('not.be.empty');
  });

  it('has visible text content', () => {
    cy.get('#root', {timeout: 20000}).invoke('text').should('not.be.empty');
  });

  it('loads MUI components', () => {
    cy.get('[class*="Mui"]', {timeout: 20000}).should(
      'have.length.greaterThan',
      0
    );
  });

  it('has interactive buttons', () => {
    cy.get('button', {timeout: 20000}).should('have.length.greaterThan', 0);
  });
});
