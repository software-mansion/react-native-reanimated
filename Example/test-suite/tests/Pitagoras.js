'use strict';

export const name = 'Pitagoras';

export function test(t) {
  t.describe('Pitagoras', () => {
    t.it('3^2 + 4^2 is 5^2?', () => {
      t.expect(9 + 16).toBe(25);
    });
  });
}
