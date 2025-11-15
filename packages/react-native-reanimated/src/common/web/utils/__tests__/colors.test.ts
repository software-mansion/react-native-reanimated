'use strict';
import { opacifyColor } from '../colors';

describe(opacifyColor, () => {
  test('returns rgba string with adjusted alpha when color is valid', () => {
    expect(opacifyColor('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });

  test('returns transparent when color is null color value', () => {
    expect(opacifyColor(null, 1)).toBeNull();
  });

  test('returns null when color cannot be processed', () => {
    expect(opacifyColor('invalid-color', 1)).toBeNull();
  });
});
