'use strict';
import { ReanimatedError } from '../../../../../common';
import { ERROR_MESSAGES, processStrokeDashArray } from '../stroke';

describe(processStrokeDashArray, () => {
  describe('single value', () => {
    test('converts length value to a single-element array', () => {
      expect(processStrokeDashArray(10)).toEqual([10]);
      expect(processStrokeDashArray('10%')).toEqual(['10%']);
    });

    test('returns "none" for "none" value', () => {
      expect(processStrokeDashArray('none')).toEqual('none');
    });

    test('throws an error for invalid values', () => {
      expect(() => processStrokeDashArray('invalid')).toThrow(
        new ReanimatedError(ERROR_MESSAGES.invalidDashArray('invalid'))
      );
    });
  });

  describe('array value', () => {
    test('throws an error for invalid values', () => {
      expect(() => processStrokeDashArray([10, '10px'])).toThrow(
        new ReanimatedError(ERROR_MESSAGES.invalidDashArray([10, '10px']))
      );
    });

    describe('duplicates the array if it has an odd number of elements (only if there are more than 2 elements)', () => {
      test.each([
        [[10], [10]],
        [
          [10, 20],
          [10, 20],
        ],
        [
          [10, 20, 30],
          [10, 20, 30, 10, 20, 30],
        ],
        [
          [10, 20, 30, 40],
          [10, 20, 30, 40],
        ],
        [
          [10, 20, 30, 40, 50],
          [10, 20, 30, 40, 50, 10, 20, 30, 40, 50],
        ],
      ])('for %p returns %p', (input, expected) => {
        expect(processStrokeDashArray(input)).toEqual(expected);
      });
    });
  });
});
