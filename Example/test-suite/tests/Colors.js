'use strict';
import { processColor } from 'react-native-reanimated';

export const name = 'Colors';

export function test(t) {
  t.describe('colors', () => {
    // test basic colors
    t.it('process red color', () => {
      const padding = 2;
      // test red
      const redStr = processColor('red')
        .toString(16)
        .substring(padding + 0, padding + 2);
      const redNum = Number.parseInt(redStr, 16);
      t.expect(redNum).not.toBe(0);

      // test green
      const greenStr = processColor('green')
        .toString(16)
        .substring(padding + 2, padding + 4);
      const greenNum = Number.parseInt(greenStr, 16);
      t.expect(greenNum).not.toBe(0);

      // test blue
      const blueStr = processColor('blue')
        .toString(16)
        .substring(padding + 4, padding + 6);
      const blueNum = Number.parseInt(blueStr, 16);
      t.expect(blueNum).not.toBe(0);
    });
  });
}
