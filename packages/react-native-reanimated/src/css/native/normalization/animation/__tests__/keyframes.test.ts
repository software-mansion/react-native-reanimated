'use strict';
import { ReanimatedError } from '../../../../../common';
import {
  ERROR_MESSAGES,
  normalizeKeyframeSelector,
  processKeyframes,
} from '../keyframes';

describe(normalizeKeyframeSelector, () => {
  describe('single selector', () => {
    describe('keyword', () => {
      it('returns 0 for from', () => {
        expect(normalizeKeyframeSelector('from')).toEqual([0]);
      });

      it('returns 1 for to', () => {
        expect(normalizeKeyframeSelector('to')).toEqual([1]);
      });

      it('throws an error for invalid keyword', () => {
        expect(() => normalizeKeyframeSelector('invalid')).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidOffsetType('invalid'))
        );
      });
    });

    describe('number', () => {
      it('returns the same value for numbers between 0 and 1', () => {
        expect(normalizeKeyframeSelector(0.5)).toEqual([0.5]);
      });

      it('converts number strings to numbers', () => {
        expect(normalizeKeyframeSelector('0.5')).toEqual([0.5]);
      });

      it('throws an error for numbers outside of 0 and 1', () => {
        expect(() => normalizeKeyframeSelector(-0.1)).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidOffsetRange(-0.1))
        );
        expect(() => normalizeKeyframeSelector(1.1)).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidOffsetRange(1.1))
        );
      });

      it('throws an error for invalid numbers', () => {
        expect(() => normalizeKeyframeSelector('1+')).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidOffsetType('1+'))
        );
        expect(() => normalizeKeyframeSelector(NaN)).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidOffsetType(NaN))
        );
      });
    });

    describe('percentage', () => {
      it('converts percentages to numbers between 0 and 1', () => {
        expect(normalizeKeyframeSelector('50%')).toEqual([0.5]);
      });

      it('throws an error for invalid percentages', () => {
        expect(() => normalizeKeyframeSelector('101%')).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidOffsetRange('101%'))
        );
      });
    });
  });

  describe('multiple selectors', () => {
    test.each([
      ['from, 50%, to', [0, 0.5, 1]],
      ['0%, 25%, 50%, 75%, 100%', [0, 0.25, 0.5, 0.75, 1]],
      // this function doesn't filter out duplicates and doesn't change the order
      ['10%, 30%, 20%', [0.1, 0.3, 0.2]],
      ['to, 0%, 1, 20%', [1, 0, 1, 0.2]],
      ['0, 0.5, 1', [0, 0.5, 1]],
    ])('converts %p to %p', (selectors, expected) => {
      expect(normalizeKeyframeSelector(selectors)).toEqual(expected);
    });
  });
});

function mockStyleBuilder(
  separatelyInterpolatedNestedProperties: string[] = []
) {
  const separatelyInterpolatedNestedPropertiesSet = new Set(
    separatelyInterpolatedNestedProperties
  );

  return {
    buildFrom: jest.fn().mockImplementation((props) => props),
    isSeparatelyInterpolatedNestedProperty: jest
      .fn()
      .mockImplementation((property) =>
        separatelyInterpolatedNestedPropertiesSet.has(property)
      ),
    add: jest.fn(),
  };
}

describe(processKeyframes, () => {
  describe('duplicate selectors', () => {
    test.each([
      [
        { from: { opacity: 0.5 }, '0, 0%': { opacity: 0.75 } },
        [{ offset: 0, style: { opacity: 0.75 } }],
      ],
      [
        { 'to, 100%, 0%, 0%': { opacity: 0.75 } },
        [
          { offset: 0, style: { opacity: 0.75 }, timingFunction: undefined },
          { offset: 1, style: { opacity: 0.75 }, timingFunction: undefined },
        ],
      ],
    ])('merges duplicate selectors in %p', (keyframes, expected) => {
      const styleBuilder = mockStyleBuilder();
      expect(processKeyframes(keyframes, styleBuilder)).toEqual(expected);
    });
  });

  describe('simple properties', () => {});

  describe('nested properties', () => {});

  describe('multiple keyframes and properties', () => {});
});
