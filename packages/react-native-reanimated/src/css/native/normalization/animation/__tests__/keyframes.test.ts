'use strict';
import { getPropsBuilder, ReanimatedError } from '../../../../../common';
import type { Repeat } from '../../../../types';
import {
  ERROR_MESSAGES,
  normalizeAnimationKeyframes,
  normalizeKeyframeSelector,
  processKeyframes,
} from '../keyframes';

type PropsBuilderInstance = ReturnType<typeof getPropsBuilder>;
type BuildFn = PropsBuilderInstance['build'];
type BuildReturn = ReturnType<BuildFn>;
type BuildArgs = Parameters<BuildFn>;

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

const createMockPropsBuilder = () => {
  const buildMock = jest.fn<BuildReturn | undefined, BuildArgs>(
    (props) => props
  );

  return {
    builder: { build: buildMock } as PropsBuilderInstance,
    buildMock,
  };
};

describe(processKeyframes, () => {
  describe('offset handling', () => {
    test('sorts keyframes and accepts percentages', () => {
      const { builder } = createMockPropsBuilder();
      const keyframes = {
        '75%': { opacity: 0.75 },
        from: { opacity: 0 },
        '0.25': { opacity: 0.25 },
        to: { opacity: 1 },
      };

      expect(processKeyframes(keyframes, builder)).toEqual([
        { offset: 0, props: { opacity: 0 } },
        { offset: 0.25, props: { opacity: 0.25 } },
        { offset: 0.75, props: { opacity: 0.75 } },
        { offset: 1, props: { opacity: 1 } },
      ]);
    });

    test('splits multi-selector entries into separate keyframes', () => {
      const { builder } = createMockPropsBuilder();
      const keyframes = {
        'from, 50%': { opacity: 0.5 },
        to: { opacity: 1 },
      };

      expect(processKeyframes(keyframes, builder)).toEqual([
        { offset: 0, props: { opacity: 0.5 } },
        { offset: 0.5, props: { opacity: 0.5 } },
        { offset: 1, props: { opacity: 1 } },
      ]);
    });
  });

  describe('complex properties', () => {
    const propsBuilder = getPropsBuilder('RCTView', 'View');

    test('transform preserves array of operations', () => {
      const keyframes = {
        '0%': { transform: [{ translateX: 0 }] },
        '100%': { transform: [{ translateX: 100 }] },
      };

      expect(processKeyframes(keyframes, propsBuilder)).toEqual([
        { offset: 0, props: { transform: [{ translateX: 0 }] } },
        { offset: 1, props: { transform: [{ translateX: 100 }] } },
      ]);
    });

    test('transformOrigin preserves nested array structure', () => {
      const fromTransformOrigin: Repeat<number | string, 3> = [0, '50%', 0];
      const toTransformOrigin: Repeat<number | string, 3> = ['100%', 0, 25];
      const keyframes = {
        from: { transformOrigin: fromTransformOrigin },
        to: { transformOrigin: toTransformOrigin },
      };

      const result = processKeyframes(keyframes, propsBuilder);

      expect(result).toEqual([
        {
          offset: 0,
          props: { transformOrigin: fromTransformOrigin },
        },
        {
          offset: 1,
          props: { transformOrigin: toTransformOrigin },
        },
      ]);
    });

    test.each(['shadowOffset', 'textShadowOffset'] as const)(
      '%s preserves nested object structure',
      (property) => {
        const keyframes = {
          from: { [property]: { width: 0, height: 0 } },
          '50%': { [property]: { width: 3, height: 2 } },
          to: { [property]: { width: 10, height: 5 } },
        };

        const result = processKeyframes(keyframes, propsBuilder);

        expect(result).toEqual([
          {
            offset: 0,
            props: {
              [property]: { width: 0, height: 0 },
            },
          },
          {
            offset: 0.5,
            props: {
              [property]: { width: 3, height: 2 },
            },
          },
          {
            offset: 1,
            props: {
              [property]: { width: 10, height: 5 },
            },
          },
        ]);
      }
    );

    test('boxShadow preserves nested object structure', () => {
      const keyframes = {
        '0%': {
          boxShadow: [
            { offsetX: 0, offsetY: 0, blurRadius: 0, color: 'rgb(255 0 0)' },
          ],
        },
        '50%': {
          boxShadow: [
            { offsetX: 4, offsetY: 2, blurRadius: 2, color: 'rgb(0 0 255)' },
          ],
        },
        '100%': {
          boxShadow: [
            { offsetX: 10, offsetY: 5, blurRadius: 4, color: 'rgb(0 255 0)' },
            { offsetX: 0, offsetY: 0, blurRadius: 2, color: 'rgb(0 0 255)' },
          ],
        },
      };

      const result = processKeyframes(keyframes, propsBuilder);

      expect(result).toEqual([
        {
          offset: 0,
          props: {
            boxShadow: [
              {
                offsetX: 0,
                offsetY: 0,
                blurRadius: 0,
                spreadDistance: 0,
                color: 0xffff0000,
              },
            ],
          },
        },
        {
          offset: 0.5,
          props: {
            boxShadow: [
              {
                offsetX: 4,
                offsetY: 2,
                blurRadius: 2,
                spreadDistance: 0,
                color: 0xff0000ff,
              },
            ],
          },
        },
        {
          offset: 1,
          props: {
            boxShadow: [
              {
                offsetX: 10,
                offsetY: 5,
                blurRadius: 4,
                spreadDistance: 0,
                color: 0xff00ff00,
              },
              {
                offsetX: 0,
                offsetY: 0,
                blurRadius: 2,
                spreadDistance: 0,
                color: 0xff0000ff,
              },
            ],
          },
        },
      ]);
    });
  });

  test('drops keyframes when processed props are undefined', () => {
    const { builder, buildMock } = createMockPropsBuilder();
    buildMock
      .mockImplementationOnce(() => undefined)
      .mockImplementation((props) => props);

    const keyframes = {
      from: { shadowOffset: { width: 0, height: 0 } },
      to: { shadowOffset: { width: 10, height: 5 } },
    };

    expect(processKeyframes(keyframes, builder)).toEqual([
      { offset: 1, props: { shadowOffset: { width: 10, height: 5 } } },
    ]);

    buildMock.mockRestore();
  });

  test('merges props for duplicate offsets', () => {
    const { builder } = createMockPropsBuilder();
    const keyframes = {
      '0%': { opacity: 0.5 },
      '0': { transform: [{ scale: 1 }] },
      '100%': { opacity: 1 },
    };

    expect(processKeyframes(keyframes, builder)).toEqual([
      {
        offset: 0,
        props: { opacity: 0.5, transform: [{ scale: 1 }] },
      },
      { offset: 1, props: { opacity: 1 } },
    ]);
  });
});

describe(normalizeAnimationKeyframes, () => {
  test('aggregates props and timing functions across keyframes', () => {
    const result = normalizeAnimationKeyframes(
      {
        from: { opacity: 0, animationTimingFunction: 'ease-in' },
        '50%': {
          shadowOffset: { width: 2, height: 4 },
          animationTimingFunction: 'ease',
        },
        to: { opacity: 1 },
      },
      'RCTView',
      'View'
    );

    expect(result).toEqual({
      propKeyframes: {
        opacity: [
          { offset: 0, value: 0 },
          { offset: 1, value: 1 },
        ],
        shadowOffset: {
          width: [{ offset: 0.5, value: 2 }],
          height: [{ offset: 0.5, value: 4 }],
        },
      },
      keyframeTimingFunctions: {
        0: 'ease-in',
        0.5: 'ease',
      },
    });
  });

  test("doesn't include timing function declared in the last keyframe", () => {
    const result = normalizeAnimationKeyframes(
      {
        from: { opacity: 0, animationTimingFunction: 'ease-in' },
        to: { opacity: 1, animationTimingFunction: 'ease-out' },
      },
      'RCTView',
      'View'
    );

    expect(result).toEqual({
      propKeyframes: {
        opacity: [
          { offset: 0, value: 0 },
          { offset: 1, value: 1 },
        ],
      },
      keyframeTimingFunctions: {
        0: 'ease-in',
      },
    });
  });
});
