export {};

describe('Simple animation Test', () => {
  const waitForHydration = () =>
    cy.window().should('have.property', '__NEXT_HYDRATED__', true);

  it('Visits the test page and tests component width before and after animation', () => {
    // open NextExample page
    cy.visit('http://localhost:3000');
    waitForHydration();

    // navigate to test page
    cy.contains('e2e test page').click();
    cy.url().should('include', '/test');
    waitForHydration();

    // test component width before and after animation
    cy.get('[data-testid=box]').should('have.css', 'width', '10px');
    cy.contains('Start animation').click();
    cy.wait(1000);
    cy.get('[data-testid=box]').should('have.css', 'width', '300px');
  });
});
