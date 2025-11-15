'use strict';
import { ERROR_MESSAGES, processFontWeight } from '../font';

describe(processFontWeight, () => {
  describe('valid values', () => {
    test.each([
      [400, '400'],
      ['500', '500'],
      ['bold', '700'],
      ['medium', '500'],
    ])('normalizes %p to %p', (input, expected) => {
      expect(processFontWeight(input)).toBe(expected);
    });
  });

  describe('invalid values', () => {
    test('throws when value unsupported', () => {
      expect(() => processFontWeight('unknown-weight')).toThrow(
        ERROR_MESSAGES.invalidFontWeight('unknown-weight')
      );
    });
  });
});
