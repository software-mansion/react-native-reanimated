'use strict';
import { ReanimatedError } from '../../../errors';
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

  describe('throws an error for invalid font weight values', () => {
    test.each(['unknown-weight', '1000', '0', 505])(
      'throws an error for %p',
      (value) => {
        expect(() => processFontWeight(value)).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidFontWeight(value))
        );
      }
    );
  });
});
