'use strict';

import { type CSSGradientStop } from '../../../../types';
import { processSVGGradientStops } from '../stops';

describe(processSVGGradientStops, () => {
  test('returns empty array for invalid input', () => {
    // @ts-expect-error improper argument
    expect(processSVGGradientStops(null)).toEqual([]);
    expect(processSVGGradientStops([])).toEqual([]);
  });

  describe('Color and Opacity processing', () => {
    it('processes basic colors and defaults opacity to 1', () => {
      const input = [{ offset: 0, color: 'red' }];
      const result = processSVGGradientStops(input);

      // (1.0 * 255) << 24 | 0xff0000 => 0xff000000 | 0x00ff0000 => 4293918720
      expect(result[0]).toEqual({
        offset: 0,
        color: 4294901760, // 0xFFFF0000
      });
    });

    it('merges opacity into the color integer using bitwise operations', () => {
      const input = [{ offset: 0.5, color: 'blue', opacity: 0.5 }];
      const result = processSVGGradientStops(input);

      // Alpha: Math.round(0.5 * 255) = 128 (0x80)
      // Color: 0x0000ff
      // Result: (0x80 << 24) | 0x0000ff = 0x800000ff (2147483903)
      expect(result[0].color).toBe(2147483903);
      expect(result[0].offset).toBe(0.5);
    });

    it('merges opacity into the color integer using bitwise operations', () => {
      const input = [{ offset: 0.5, color: '#0000ffee', opacity: 0.5 }];
      const result = processSVGGradientStops(input);

      // Alpha: Math.round(0.5 * 238) = 119 (0x77)
      // Color: 0x0000ffee
      // Result: (0x77 << 24) | 0x0000ff = 0x770000ff (1996488959)
      expect(result[0].color).toBe(1996488959);
      expect(result[0].offset).toBe(0.5);
    });
  });

  describe('Sorting and Offsets', () => {
    test('sorts stops by offset in ascending order', () => {
      const input = [
        { offset: 1, color: 'blue' },
        { offset: 0, color: 'red' },
        { offset: 0.5, color: 'red' },
      ];
      const result = processSVGGradientStops(input);

      expect(result[0].offset).toBe(0);
      expect(result[1].offset).toBe(0.5);
      expect(result[2].offset).toBe(1);
    });

    test('defaults offset to 0 if not provided', () => {
      const input = [{ color: 'red' }] as CSSGradientStop[];
      const result = processSVGGradientStops(input);
      expect(result[0].offset).toBe(0);
    });
  });

  describe('Bitwise edge cases', () => {
    test.each([
      [1, 'red', 4294901760], // 100% opacity Red
      [0, 'blue', 255], // 0% opacity Blue (0x000000ff)
      [0.2, 'blue', 855638271], // 20% opacity Blue (0x330000ff)
    ])(
      'for opacity %p and color %p returns color integer %p',
      (opacity, color, expectedColor) => {
        const result = processSVGGradientStops([{ offset: 0, color, opacity }]);
        expect(result[0].color).toBe(expectedColor);
      }
    );
  });
});
