'use strict';
import { processColor as reaProcessColor } from 'react-native-reanimated';
import { processColor } from 'react-native';

export const name = 'Colors';

export function test(t) {
  t.describe('colors', () => {
    t.it('process basic colors', () => {
      const testData = [
        'red',
        'green',
        'blue',
        'white',
        'black',
        'cyan',
        'orange',
        'yellow',
        'purple',
      ];

      testData.forEach((color) => {
        const reaResult = reaProcessColor(color);
        const rnResult = processColor(color);
        t.expect(rnResult).toBe(reaResult);
      });
    });
  });
}
