'use strict';
import { ReanimatedError } from '../../../../../errors';
import type { CSSAnimationKeyframeSelector } from '../../../../../types';
import { normalizeAnimationKeyframes, ERROR_MESSAGES } from '../keyframes';

describe(normalizeAnimationKeyframes, () => {
  describe('offset normalization', () => {
    describe('when offset is valid', () => {
      it.each([
        ['from', 0],
        ['to', 1],
        ['0%', 0],
        ['100%', 1],
        ['50%', 0.5],
        [0, 0],
        [0.5, 0.5],
        [1, 1],
      ])(`normalizes %p to %p`, (offset, expected) => {
        expect(
          normalizeAnimationKeyframes({ [offset]: { opacity: 1 } })
        ).toEqual({
          keyframesStyle: { opacity: [{ offset: expected, value: 1 }] },
          keyframeTimingFunctions: {},
        });
      });
    });

    describe('when offset type is invalid', () => {
      it.each(['invalid', NaN, undefined, null])(
        'throws an error for %p',
        (offset) => {
          const value = offset as CSSAnimationKeyframeSelector;
          expect(() =>
            normalizeAnimationKeyframes({ [value]: { opacity: 1 } })
          ).toThrow(
            new ReanimatedError(ERROR_MESSAGES.invalidOffsetType(value))
          );
        }
      );
    });

    describe('when offset is out of range', () => {
      it.each([-1, 2, Infinity, '101%'])('throws an error for %p', (offset) => {
        const value = offset as CSSAnimationKeyframeSelector;
        expect(() =>
          normalizeAnimationKeyframes({ [value]: { opacity: 1 } })
        ).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidOffsetRange(value))
        );
      });
    });
  });

  describe('multi-offset normalization', () => {
    describe('when valid offsets are provided', () => {
      it.each([
        ['from, 50%, to', [0, 0.5, 1]],
        ['0%, 25%, 50%, 75%, 100%', [0, 0.25, 0.5, 0.75, 1]],
        ['10%, 30%, 20%', [0.1, 0.2, 0.3]],
        ['to, 0%, 1, 20%', [0, 0.2, 1]],
        ['0, 0.5, 1', [0, 0.5, 1]],
      ])('normalizes %p to %p', (offset, expected) => {
        expect(
          normalizeAnimationKeyframes({ [offset]: { opacity: 1 } })
        ).toEqual({
          keyframeTimingFunctions: {},
          keyframesStyle: {
            opacity: expected.map((normalizedOffset) => ({
              offset: normalizedOffset,
              value: 1,
            })),
          },
        });
      });
    });

    describe('when invalid offsets are provided', () => {
      it.each([
        ['from, invalid, to', ERROR_MESSAGES.invalidOffsetType('invalid')],
        ['0%, 25%, 101%, 75%, 100%', ERROR_MESSAGES.invalidOffsetRange('101%')],
        ['0, NaN, 1', ERROR_MESSAGES.invalidOffsetType(NaN)],
      ])('throws an error for %p', (offset, errorMsg) => {
        const value = offset as CSSAnimationKeyframeSelector;
        expect(() =>
          normalizeAnimationKeyframes({ [value]: { opacity: 1 } })
        ).toThrow(new ReanimatedError(errorMsg));
      });
    });
  });

  describe('keyframesStyle', () => {
    it('converts keyframes to style with properties with offset', () => {
      expect(
        normalizeAnimationKeyframes({
          from: { opacity: 0 },
          '50%': { opacity: 0.5 },
          to: { opacity: 1 },
        })
      ).toEqual({
        keyframesStyle: {
          opacity: [
            { offset: 0, value: 0 },
            { offset: 0.5, value: 0.5 },
            { offset: 1, value: 1 },
          ],
        },
        keyframeTimingFunctions: {},
      });
    });

    it('handles nested style properties', () => {
      expect(
        normalizeAnimationKeyframes({
          from: { shadowOffset: { width: 0, height: 0 } },
          to: { shadowOffset: { width: 10, height: 10 } },
        })
      ).toEqual({
        keyframesStyle: {
          shadowOffset: {
            width: [
              { offset: 0, value: 0 },
              { offset: 1, value: 10 },
            ],
            height: [
              { offset: 0, value: 0 },
              { offset: 1, value: 10 },
            ],
          },
        },
        keyframeTimingFunctions: {},
      });
    });

    it('orders property values by offset', () => {
      expect(
        normalizeAnimationKeyframes({
          to: { opacity: 1 },
          '50%': { opacity: 0.5 },
          '75%': { opacity: 0.75 },
          '25%': { opacity: 0.25 },
          from: { opacity: 0 },
        })
      ).toEqual({
        keyframesStyle: {
          opacity: [
            { offset: 0, value: 0 },
            { offset: 0.25, value: 0.25 },
            { offset: 0.5, value: 0.5 },
            { offset: 0.75, value: 0.75 },
            { offset: 1, value: 1 },
          ],
        },
        keyframeTimingFunctions: {},
      });
    });

    it('treats array values as primitives', () => {
      expect(
        normalizeAnimationKeyframes({
          from: { transform: [{ scale: 0 }, { rotate: '0deg' }] },
          to: { transform: [{ scale: 1 }, { rotate: '360deg' }] },
        })
      ).toEqual({
        keyframesStyle: {
          transform: [
            { offset: 0, value: [{ scale: 0 }, { rotate: '0deg' }] },
            { offset: 1, value: [{ scale: 1 }, { rotate: '360deg' }] },
          ],
        },
        keyframeTimingFunctions: {},
      });
    });

    it('ignores undefined values', () => {
      expect(
        normalizeAnimationKeyframes({
          from: { opacity: 0, transform: undefined },
          to: { opacity: 1 },
        })
      ).toEqual({
        keyframesStyle: {
          opacity: [
            { offset: 0, value: 0 },
            { offset: 1, value: 1 },
          ],
        },
        keyframeTimingFunctions: {},
      });
    });

    it('ignores empty keyframes', () => {
      expect(
        normalizeAnimationKeyframes({
          from: {},
          '50%': { opacity: 0.5 },
          to: {},
        })
      ).toEqual({
        keyframesStyle: {
          opacity: [{ offset: 0.5, value: 0.5 }],
        },
        keyframeTimingFunctions: {},
      });
    });
  });

  describe('keyframeTimingFunctions', () => {
    it('moves timing functions from keyframes to keyframeTimingFunctions', () => {
      expect(
        normalizeAnimationKeyframes({
          '0%, 90%': { opacity: 0, animationTimingFunction: 'easeIn' },
          '25%, 35%, 70%': { opacity: 0.5, animationTimingFunction: 'ease' },
          '50%': { opacity: 0.75 },
          '75%': { opacity: 1, animationTimingFunction: 'easeOut' },
        })
      ).toEqual({
        keyframesStyle: {
          opacity: [
            { offset: 0, value: 0 },
            { offset: 0.25, value: 0.5 },
            { offset: 0.35, value: 0.5 },
            { offset: 0.5, value: 0.75 },
            { offset: 0.7, value: 0.5 },
            { offset: 0.75, value: 1 },
            { offset: 0.9, value: 0 },
          ],
        },
        keyframeTimingFunctions: {
          0: 'easeIn',
          0.25: 'ease',
          0.35: 'ease',
          0.7: 'ease',
          0.75: 'easeOut',
          0.9: 'easeIn',
        },
      });
    });

    it('ignores timing function for keyframe with offset 1', () => {
      expect(
        normalizeAnimationKeyframes({
          '0%, 100%': { opacity: 0, animationTimingFunction: 'easeIn' },
        })
      ).toEqual({
        keyframesStyle: {
          opacity: [
            { offset: 0, value: 0 },
            { offset: 1, value: 0 },
          ],
        },
        keyframeTimingFunctions: {
          0: 'easeIn',
        },
      });
    });
  });
});
