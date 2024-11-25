import { ReanimatedError } from '../../../errors';
import { cubicBezier } from '../../easing';
import type { CSSAnimationConfig, CSSAnimationKeyframes } from '../../types';
import { normalizeCSSAnimationConfig, ERROR_MESSAGES } from './config';

describe(normalizeCSSAnimationConfig, () => {
  describe('when the config is a single animation', () => {
    it('normalizes animation config', () => {
      const animationTimingFunction = cubicBezier(0.4, 0, 0.2, 1);
      const config: CSSAnimationConfig = {
        animationName: {
          from: { opacity: 1, animationTimingFunction: 'linear' },
          to: { opacity: 0.5 },
        },
        animationDuration: '1.5s',
        animationTimingFunction,
        animationDelay: '300ms',
        animationIterationCount: 3,
        animationDirection: 'reverse',
        animationFillMode: 'both',
        animationPlayState: 'paused',
      };

      expect(normalizeCSSAnimationConfig(config)).toEqual([
        {
          keyframesStyle: {
            opacity: [
              { offset: 0, value: 1 },
              { offset: 1, value: 0.5 },
            ],
          },
          keyframeTimingFunctions: { 0: 'linear' },
          duration: 1500,
          timingFunction: animationTimingFunction.normalize(),
          delay: 300,
          iterationCount: 3,
          direction: 'reverse',
          fillMode: 'both',
          playState: 'paused',
        },
      ]);
    });

    it('uses default values for unspecified properties', () => {
      const config: CSSAnimationConfig = {
        animationName: { from: { opacity: 1 }, to: { opacity: 0.5 } },
      };

      expect(normalizeCSSAnimationConfig(config)).toEqual([
        {
          keyframesStyle: {
            opacity: [
              { offset: 0, value: 1 },
              { offset: 1, value: 0.5 },
            ],
          },
          keyframeTimingFunctions: {},
          duration: 0,
          timingFunction: 'ease',
          delay: 0,
          iterationCount: 1,
          direction: 'normal',
          fillMode: 'none',
          playState: 'running',
        },
      ]);
    });

    it("throws an error if animationName isn't a keyframes object", () => {
      const config: CSSAnimationConfig = {
        animationName: 'invalid' as unknown as CSSAnimationKeyframes,
      };

      expect(() => normalizeCSSAnimationConfig(config)).toThrow(
        new ReanimatedError(ERROR_MESSAGES.invalidAnimationName())
      );
    });
  });

  describe('when the config is an array of animations', () => {
    it('uses provided properties if each animation is provided different values', () => {
      const bezier = cubicBezier(0.4, 0, 0.2, 1);
      const config: CSSAnimationConfig = {
        animationName: [
          { from: { opacity: 1 }, to: { opacity: 0.5 } },
          { from: { opacity: 0.5 }, to: { opacity: 1 } },
        ],
        animationDuration: ['1.5s', 2000],
        animationTimingFunction: ['easeInOut', bezier],
        animationDelay: ['300ms', 500],
        animationIterationCount: [3, 1],
        animationDirection: ['reverse', 'normal'],
        animationFillMode: ['both', 'none'],
        animationPlayState: ['paused', 'running'],
      };

      expect(normalizeCSSAnimationConfig(config)).toEqual([
        {
          keyframesStyle: {
            opacity: [
              { offset: 0, value: 1 },
              { offset: 1, value: 0.5 },
            ],
          },
          keyframeTimingFunctions: {},
          duration: 1500,
          timingFunction: 'easeInOut',
          delay: 300,
          iterationCount: 3,
          direction: 'reverse',
          fillMode: 'both',
          playState: 'paused',
        },
        {
          keyframesStyle: {
            opacity: [
              { offset: 0, value: 0.5 },
              { offset: 1, value: 1 },
            ],
          },
          keyframeTimingFunctions: {},
          duration: 2000,
          timingFunction: bezier.normalize(),
          delay: 500,
          iterationCount: 1,
          direction: 'normal',
          fillMode: 'none',
          playState: 'running',
        },
      ]);
    });

    it('uses the same property value if only one value is provided', () => {
      const config: CSSAnimationConfig = {
        animationName: [
          { from: { opacity: 1 }, to: { opacity: 0.5 } },
          { from: { opacity: 0.5 }, to: { opacity: 1 } },
        ],
        animationDuration: '1.5s',
        animationTimingFunction: 'easeInOut',
        animationIterationCount: 3,
        animationFillMode: 'both',
      };

      expect(normalizeCSSAnimationConfig(config)).toEqual([
        {
          keyframesStyle: {
            opacity: [
              { offset: 0, value: 1 },
              { offset: 1, value: 0.5 },
            ],
          },
          keyframeTimingFunctions: {},
          duration: 1500,
          timingFunction: 'easeInOut',
          delay: 0,
          iterationCount: 3,
          direction: 'normal',
          fillMode: 'both',
          playState: 'running',
        },
        {
          keyframesStyle: {
            opacity: [
              { offset: 0, value: 0.5 },
              { offset: 1, value: 1 },
            ],
          },
          keyframeTimingFunctions: {},
          duration: 1500,
          timingFunction: 'easeInOut',
          delay: 0,
          iterationCount: 3,
          direction: 'normal',
          fillMode: 'both',
          playState: 'running',
        },
      ]);
    });

    it('cycles through the provided values if there are more animations than values', () => {
      const config: CSSAnimationConfig = {
        animationName: [
          { from: { opacity: 1 }, to: { opacity: 0.5 } },
          { from: { width: '100%' }, to: { width: '50%' } },
          { from: { height: '100%' }, to: { height: '50%' } },
        ],
        animationDuration: ['1.5s', '2s'],
        animationTimingFunction: ['easeInOut', 'easeIn', 'easeOut', 'linear'],
        animationIterationCount: [3, Infinity],
        animationFillMode: ['both'],
      };

      expect(normalizeCSSAnimationConfig(config)).toEqual([
        {
          keyframesStyle: {
            opacity: [
              { offset: 0, value: 1 },
              { offset: 1, value: 0.5 },
            ],
          },
          keyframeTimingFunctions: {},
          duration: 1500,
          timingFunction: 'easeInOut',
          delay: 0,
          iterationCount: 3,
          direction: 'normal',
          fillMode: 'both',
          playState: 'running',
        },
        {
          keyframesStyle: {
            width: [
              { offset: 0, value: '100%' },
              { offset: 1, value: '50%' },
            ],
          },
          keyframeTimingFunctions: {},
          duration: 2000,
          timingFunction: 'easeIn',
          delay: 0,
          iterationCount: -1, // Infinity
          direction: 'normal',
          fillMode: 'both',
          playState: 'running',
        },
        {
          keyframesStyle: {
            height: [
              { offset: 0, value: '100%' },
              { offset: 1, value: '50%' },
            ],
          },
          keyframeTimingFunctions: {},
          duration: 1500,
          timingFunction: 'easeOut',
          delay: 0,
          iterationCount: 3,
          direction: 'normal',
          fillMode: 'both',
          playState: 'running',
        },
      ]);
    });

    it('throws an error if animationName is not a keyframes object in at least one animation', () => {
      const config: CSSAnimationConfig = {
        animationName: [
          { from: { opacity: 1 }, to: { opacity: 0.5 } },
          'invalid' as unknown as CSSAnimationKeyframes,
        ],
      };

      expect(() => normalizeCSSAnimationConfig(config)).toThrow(
        new ReanimatedError(ERROR_MESSAGES.invalidAnimationName())
      );
    });
  });
});
