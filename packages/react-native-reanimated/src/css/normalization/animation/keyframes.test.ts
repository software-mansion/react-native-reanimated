import { ReanimatedError } from '../../../errors';
import type { CSSAnimationKeyframeOffset } from '../../types';
import { createKeyframeStyle, ERROR_MESSAGES } from './keyframes';

describe(createKeyframeStyle, () => {
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
        expect(createKeyframeStyle({ [offset]: { opacity: 1 } })).toEqual({
          opacity: [{ offset: expected, value: 1 }],
        });
      });
    });

    describe('when offset type is invalid', () => {
      it.each(['invalid', NaN, undefined, null])(
        'throws an error for %p',
        (offset) => {
          const value = offset as CSSAnimationKeyframeOffset;
          expect(() =>
            createKeyframeStyle({ [value]: { opacity: 1 } })
          ).toThrow(
            new ReanimatedError(ERROR_MESSAGES.invalidOffsetType(value))
          );
        }
      );
    });

    describe('when offset is out of range', () => {
      it.each([-1, 2, Infinity, '101%'])('throws an error for %p', (offset) => {
        const value = offset as CSSAnimationKeyframeOffset;
        expect(() => createKeyframeStyle({ [value]: { opacity: 1 } })).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidOffsetRange(value))
        );
      });
    });
  });

  describe('keyframe style creation', () => {
    it('converts keyframes to style with properties with offset', () => {
      expect(
        createKeyframeStyle({
          from: { opacity: 0 },
          '50%': { opacity: 0.5 },
          to: { opacity: 1 },
        })
      ).toEqual({
        opacity: [
          { offset: 0, value: 0 },
          { offset: 0.5, value: 0.5 },
          { offset: 1, value: 1 },
        ],
      });
    });

    it('handles nested style properties', () => {
      expect(
        createKeyframeStyle({
          from: { shadowOffset: { width: 0, height: 0 } },
          to: { shadowOffset: { width: 10, height: 10 } },
        })
      ).toEqual({
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
      });
    });

    it('orders property values by offset', () => {
      expect(
        createKeyframeStyle({
          to: { opacity: 1 },
          '50%': { opacity: 0.5 },
          '75%': { opacity: 0.75 },
          '25%': { opacity: 0.25 },
          from: { opacity: 0 },
        })
      ).toEqual({
        opacity: [
          { offset: 0, value: 0 },
          { offset: 0.25, value: 0.25 },
          { offset: 0.5, value: 0.5 },
          { offset: 0.75, value: 0.75 },
          { offset: 1, value: 1 },
        ],
      });
    });

    it('treats array values as primitives', () => {
      expect(
        createKeyframeStyle({
          from: { transform: [{ scale: 0 }, { rotate: '0deg' }] },
          to: { transform: [{ scale: 1 }, { rotate: '360deg' }] },
        })
      ).toEqual({
        transform: [
          { offset: 0, value: [{ scale: 0 }, { rotate: '0deg' }] },
          { offset: 1, value: [{ scale: 1 }, { rotate: '360deg' }] },
        ],
      });
    });

    it('ignores undefined values', () => {
      expect(
        createKeyframeStyle({
          from: { opacity: 0, transform: undefined },
          to: { opacity: 1 },
        })
      ).toEqual({
        opacity: [
          { offset: 0, value: 0 },
          { offset: 1, value: 1 },
        ],
      });
    });

    it('ignores empty keyframes', () => {
      expect(
        createKeyframeStyle({
          from: {},
          '50%': { opacity: 0.5 },
          to: {},
        })
      ).toEqual({
        opacity: [{ offset: 0.5, value: 0.5 }],
      });
    });
  });
});
