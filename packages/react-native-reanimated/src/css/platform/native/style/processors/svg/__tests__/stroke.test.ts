import { ReanimatedError } from '../../../../../../../common';
import { ERROR_MESSAGES, processStrokeDashArray } from '../stroke';

describe(processStrokeDashArray, () => {
  describe('single value', () => {
    it('converts length value to a single-element array', () => {
      expect(processStrokeDashArray(10)).toEqual([10]);
      expect(processStrokeDashArray('10%')).toEqual(['10%']);
    });

    it('returns "none" for "none" value', () => {
      expect(processStrokeDashArray('none')).toEqual('none');
    });

    it('throws an error for invalid values', () => {
      expect(() => processStrokeDashArray('invalid')).toThrow(
        new ReanimatedError(ERROR_MESSAGES.invalidDashArray('invalid'))
      );
    });
  });

  describe('array value', () => {
    it('throws an error for invalid values', () => {
      expect(() => processStrokeDashArray([10, '10px'])).toThrow(
        new ReanimatedError(ERROR_MESSAGES.invalidDashArray([10, '10px']))
      );
    });

    it('returns an array with a single 0 value if an empty array is passed', () => {
      expect(processStrokeDashArray([])).toEqual([0]);
    });

    describe('duplicates the array if it has an odd number of elements (only if there are more than 2 elements)', () => {
      it.each([
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
