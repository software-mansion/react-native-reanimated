'use strict';
import { processColor } from 'react-native-reanimated';

export const name = 'Colors';

export function test(t) {
  t.describe('colors', () => {
    t.it('process basic colors', () => {
      const testData = [
        ['red', 'ff0000'],
        ['green', '008000'],
        ['blue', '0000ff'],
      ];

      const obtainColorString = (color) => {
        const padding = 2;
        return processColor(color)
          .toString(16)
          .substring(padding);
      };

      testData.forEach(([color, expectedString]) => {
        t.expect(obtainColorString(color)).toBe(expectedString);
      });
    });
  });
}
