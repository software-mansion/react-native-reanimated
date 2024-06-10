export {};

describe('Simple animation Test', () => {
  it('Visits the test page and tests component width before and after animation', () => {
    // open NextExample page
    cy.visit('http://localhost:3000');

    // navigate to test page
    cy.contains('e2e test page').click();
    cy.url().should('include', '/test');

    // test component width before and after animation
    cy.get('[data-testid=box]').should('have.css', 'width', '10px');
    cy.contains('Start animation').click();
    cy.wait(1000);
    cy.get('[data-testid=box]').should('have.css', 'width', '300px');
  });
});
