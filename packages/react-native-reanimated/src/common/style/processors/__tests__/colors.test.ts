'use strict';
import { ReanimatedError } from '../../../errors';
import { ValueProcessorTarget } from '../../../types';
import { ERROR_MESSAGES, processColor } from '../colors';

describe(processColor, () => {
  describe('properly converts colors', () => {
    test.each([
      ['red', 0xff0000ff],
      ['rgb(255, 200, 0)', 0xffc800ff],
      ['rgba(50, 100, 150, 0.6)', 0x32649699],
      ['#34a', 0x3344aaff],
      ['hsl(240, 100%, 50%)', 0x0000ffff],
      ['hsla(120, 50%, 50%, 0.5)', 0x40bf4080],
      ['hwb(0, 0%, 0%)', 0xff0000ff],
      ['transparent', 0x00000000],
    ])('converts %p to %p', (value, expected) => {
      // convert from RGBA to ARGB format if not null
      const argb =
        typeof expected === 'number' &&
        ((expected << 24) | (expected >>> 8)) >>> 0;
      expect(processColor(value)).toEqual(argb);
    });

    test('returns false for transparent color with CSS target', () => {
      expect(
        processColor('transparent', { target: ValueProcessorTarget.CSS })
      ).toBe(false);
    });
  });

  describe('throws an error for invalid color values', () => {
    test.each([
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
