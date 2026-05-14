'use strict';

import { ERROR_MESSAGES, processColorSVG } from '../colors';

const COLOR_CASES: Array<[string, string | number, number]> = [
  ['hex', '#ff0000', 0xffff0000],
  ['named', 'blue', 0xff0000ff],
  ['rgb', 'rgb(0, 128, 255)', 0xff0080ff],
  ['rgba', 'rgba(255, 0, 128, 0.5)', 0x80ff0080],
  ['numeric', 0x12345678, 0x78123456], // 0xRRGGBBAA -> 0xAARRGGBB
];

describe(processColorSVG, () => {
  test.each(COLOR_CASES)(
    'returns numeric value for %s input',
    (_label, input, expected) => {
      expect(processColorSVG(input)).toBe(expected);
    }
  );

  test('returns false for the literal `transparent` keyword', () => {
    expect(processColorSVG('transparent')).toBe(false);
  });

  test.each([
    ['rgba comma', 'rgba(0, 0, 0, 0)'],
    ['rgba slash', 'rgba(0 0 0 / 0)'],
    ['hsla comma', 'hsla(0, 0%, 0%, 0)'],
    ['hsla slash', 'hsla(0 0% 0% / 0)'],
    ['hex 8 with 00', '#00000000'],
  ])('returns 0 for explicit zero-alpha input (%s)', (_label, input) => {
    expect(processColorSVG(input)).toBe(0);
  });

  test('returns the literal ARGB integer for non-black transparent colours', () => {
    expect(processColorSVG('rgba(0, 0, 255, 0)')).toBe(0x000000ff);
  });

  test('passes through currentColor keyword', () => {
    expect(processColorSVG('currentColor')).toBe('currentColor');
  });

  test('throws for unsupported values with proper message', () => {
    const invalidValue = 'url(#gradient)';
    expect(() => processColorSVG(invalidValue)).toThrow(
      new Error(`[Reanimated] ${ERROR_MESSAGES.invalidColor(invalidValue)}`)
    );
  });
});
