'use strict';
import { processColor } from '../colors';
import { processBoxShadow } from '../shadows';

// Runs in the android jest project, so IS_ANDROID is true. React Native guards a
// blur that converts to a zero radius since 0.79, so Android keeps the given one.
describe('processBoxShadow (Android)', () => {
  test.each([
    ['inset 0 0 0 1px red', 0],
    ['0 0 0 1px red', 0],
    ['0 0 0.5px red', 0.5],
    ['0 0 10px red', 10],
  ])('keeps the blur radius of %s', (input, blurRadius) => {
    expect(processBoxShadow(input)).toEqual([
      expect.objectContaining({ blurRadius }),
    ]);
  });

  test('keeps a shadow object without a blur radius at zero', () => {
    expect(
      processBoxShadow([
        {
          offsetX: 0,
          offsetY: 0,
          spreadDistance: 1,
          color: 'red',
          inset: true,
        },
      ])
    ).toEqual([
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 0,
        spreadDistance: 1,
        color: processColor('red'),
        inset: true,
      },
    ]);
  });
});
