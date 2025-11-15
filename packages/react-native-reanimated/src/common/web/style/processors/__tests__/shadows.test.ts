'use strict';
import { processBoxShadowWeb } from '../shadows';

describe(processBoxShadowWeb, () => {
  test('converts string input to CSS box-shadow', () => {
    expect(processBoxShadowWeb('10px 5px 4px red')).toBe('10px 5px 4px red');
  });

  test('handles array input', () => {
    expect(
      processBoxShadowWeb([
        { offsetX: 1, offsetY: 2, blurRadius: 3, color: 'blue' },
        { offsetX: '4px', offsetY: '5px', inset: true },
      ])
    ).toBe('1px 2px 3px blue, 4px 5px #000 inset');
  });
});
