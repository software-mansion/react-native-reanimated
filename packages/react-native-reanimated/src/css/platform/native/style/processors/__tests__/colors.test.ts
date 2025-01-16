'use strict';
import { ERROR_MESSAGES, processColor } from '../colors';
import { ReanimatedError } from '../../../../../errors';

describe(processColor, () => {
  describe('converts color strings to numbers for all color props', () => {
    it.each([
      ['backgroundColor', 'red', 0xff0000ff],
      ['color', 'rgb(255, 200, 0)', 0xffc800ff],
      ['textDecorationColor', 'rgba(50, 100, 150, 0.6)', 0x32649699],
      ['textShadowColor', '#34a', 0x3344aaff],
      ['borderColor', '#123456', 0x123456ff],
      ['borderTopColor', '#abc', 0xaabbccff],
      ['borderBlockStartColor', '#ff5733', 0xff5733ff],
      ['borderRightColor', 'hsl(240, 100%, 50%)', 0x0000ffff],
      ['borderEndColor', 'hsla(120, 50%, 50%, 0.5)', 0x40bf4080],
      ['borderBottomColor', 'hwb(0, 0%, 0%)', 0xff0000ff],
      ['borderBlockEndColor', 'blue', 0x0000ffff],
      ['borderLeftColor', 'green', 0x008000ff],
      ['borderStartColor', 'rgb(0, 128, 255)', 0x0080ffff],
      ['borderBlockColor', 'rgba(255, 0, 128, 0.3)', 0xff00804d],
      ['shadowColor', '#00ff88', 0x00ff88ff],
      ['overlayColor', 'hsla(360, 100%, 50%, 0.75)', 0xff0000bf],
      ['tintColor', 'hsl(180, 100%, 25%)', 0x007f80ff],
    ])('converts %p with value %p to %p', (key, value, expected) => {
      const argb = ((expected << 24) | (expected >>> 8)) >>> 0;
      expect(processColor(value)).toEqual(argb);
    });
  });

  describe('throws an error for invalid color values', () => {
    it.each([
      'invalid',
      '#1',
      'rgb(255, 255, 255, 0.5)',
      'rgba(255, 255, 255)',
      'hsl(360, 100%, 50%, 0.5)',
      'hsla(360, 100%, 50%)',
      'hwb(360, 100%, 50%, 0.5)',
    ])('throws an error for %p', (value) => {
      expect(() => processColor(value)).toThrow(
        new ReanimatedError(ERROR_MESSAGES.invalidColor(value))
      );
    });
  });
});
