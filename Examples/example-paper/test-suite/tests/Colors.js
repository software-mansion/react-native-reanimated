'use strict';
import { waitForDetailed } from './helpers';
import {
  runOnUI,
  processColor as reaProcessColor,
  runOnJS,
} from 'react-native-reanimated';
import { processColor } from 'react-native';

export const name = 'Colors';

export function test(t) {
  t.describe('colors', () => {
    t.it('process basic colors', async () => {
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

      const uiResults = {};
      testData.forEach((color) => {
        // run on JS thread
        t.expect(processColor(color)).toBe(reaProcessColor(color));

        // run on UI thread
        const jsCallback = (color, uiResult) => {
          uiResults[color] = uiResult;
        };

        runOnUI(() => {
          'worklet';
          const uiResult = reaProcessColor(color);
          runOnJS(jsCallback)(color, uiResult);
        })();
      });
      const colorsProcessed = await waitForDetailed(
        () => Object.keys(uiResults).length === testData.length,
        'color processing timeout exceeded',
        1000
      );
      t.expect(colorsProcessed).toBe(true);
      Object.keys(uiResults).forEach((color) => {
        const jsResult = processColor(color);
        t.expect(uiResults[color]).toBe(jsResult);
      });
    });
  });
}
