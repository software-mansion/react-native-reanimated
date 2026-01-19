'use strict';
import { ReanimatedError } from '../../../errors';
import { ValueProcessorTarget } from '../../../types';
import { ERROR_MESSAGES, processColor, processColorsInProps } from '../colors';

describe(processColorsInProps, () => {
  describe('properly converts colors in props', () => {
    test.each([
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
      // convert from RGBA to ARGB format
      const argb = ((expected << 24) | (expected >>> 8)) >>> 0;
      const props = { [key]: value };

      processColorsInProps(props);

      expect(props).toEqual({ [key]: argb });
    });
  });

  describe('does not convert non-color properties', () => {
    test.each([
      ['width', 'red'],
      ['height', 'blue'],
      ['margin', 0x000000ff],
      ['padding', '#ff0000'],
    ])('does not convert %p', (key, value) => {
      const props = { [key]: value };

      processColorsInProps(props);

      expect(props).toEqual({ [key]: value });
    });
  });

  test('skips undefined color values', () => {
    const props = { backgroundColor: undefined };

    processColorsInProps(props);

    expect(props).toEqual(props);
  });
});

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
