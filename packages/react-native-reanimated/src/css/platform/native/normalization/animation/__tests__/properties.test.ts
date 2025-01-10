import { cubicBezier } from '../../../../../easings';
import type { CSSAnimationProperties } from '../../../../../types';
import { createSingleCSSAnimationProperties } from '../properties';

describe(createSingleCSSAnimationProperties, () => {
  describe('when there is only a single animation in properties', () => {
    it('returns properties of a single animation', () => {
      const animationTimingFunction = cubicBezier(0.4, 0, 0.2, 1);
      const config: CSSAnimationProperties = {
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

      expect(createSingleCSSAnimationProperties(config)).toEqual([
        {
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
        },
      ]);
    });

    it('returns undefined for unspecified properties', () => {
      const config: CSSAnimationProperties = {
        animationName: { from: { opacity: 1 }, to: { opacity: 0.5 } },
      };

      expect(createSingleCSSAnimationProperties(config)).toEqual([
        {
          animationName: { from: { opacity: 1 }, to: { opacity: 0.5 } },
          animationDuration: undefined,
          animationTimingFunction: undefined,
          animationDelay: undefined,
          animationIterationCount: undefined,
          animationDirection: undefined,
          animationFillMode: undefined,
          animationPlayState: undefined,
        },
      ]);
    });
  });

  describe('when the config is an array of animations', () => {
    it('uses provided properties if each animation is provided different values', () => {
      const bezier = cubicBezier(0.4, 0, 0.2, 1);
      const config: CSSAnimationProperties = {
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

      expect(createSingleCSSAnimationProperties(config)).toEqual([
        {
          animationName: {
            from: { opacity: 1 },
            to: { opacity: 0.5 },
          },
          animationDuration: '1.5s',
          animationTimingFunction: 'easeInOut',
          animationDelay: '300ms',
          animationIterationCount: 3,
          animationDirection: 'reverse',
          animationFillMode: 'both',
          animationPlayState: 'paused',
        },
        {
          animationName: {
            from: { opacity: 0.5 },
            to: { opacity: 1 },
          },
          animationDuration: 2000,
          animationTimingFunction: bezier,
          animationDelay: 500,
          animationIterationCount: 1,
          animationDirection: 'normal',
          animationFillMode: 'none',
          animationPlayState: 'running',
        },
      ]);
    });

    it('uses the same property value if only one value is provided and undefined for unspecified properties', () => {
      const config: CSSAnimationProperties = {
        animationName: [
          { from: { opacity: 1 }, to: { opacity: 0.5 } },
          { from: { opacity: 0.5 }, to: { opacity: 1 } },
        ],
        animationDuration: '1.5s',
        animationTimingFunction: 'easeInOut',
        animationIterationCount: 3,
        animationFillMode: 'both',
      };

      expect(createSingleCSSAnimationProperties(config)).toEqual([
        {
          animationName: {
            from: { opacity: 1 },
            to: { opacity: 0.5 },
          },
          animationDuration: '1.5s',
          animationTimingFunction: 'easeInOut',
          animationDelay: undefined,
          animationIterationCount: 3,
          animationDirection: undefined,
          animationFillMode: 'both',
          animationPlayState: undefined,
        },
        {
          animationName: {
            from: { opacity: 0.5 },
            to: { opacity: 1 },
          },
          animationDuration: '1.5s',
          animationTimingFunction: 'easeInOut',
          animationDelay: undefined,
          animationIterationCount: 3,
          animationDirection: undefined,
          animationFillMode: 'both',
          animationPlayState: undefined,
        },
      ]);
    });

    it('cycles through the provided values if there are more animations than values', () => {
      const config: CSSAnimationProperties = {
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

      expect(createSingleCSSAnimationProperties(config)).toEqual([
        {
          animationName: {
            from: { opacity: 1 },
            to: { opacity: 0.5 },
          },
          animationDuration: '1.5s',
          animationTimingFunction: 'easeInOut',
          animationDelay: undefined,
          animationIterationCount: 3,
          animationDirection: undefined,
          animationFillMode: 'both',
          animationPlayState: undefined,
        },
        {
          animationName: {
            from: { width: '100%' },
            to: { width: '50%' },
          },
          animationDuration: '2s',
          animationTimingFunction: 'easeIn',
          animationDelay: undefined,
          animationIterationCount: Infinity,
          animationDirection: undefined,
          animationFillMode: 'both',
          animationPlayState: undefined,
        },
        {
          animationName: {
            from: { height: '100%' },
            to: { height: '50%' },
          },
          animationDuration: '1.5s',
          animationTimingFunction: 'easeOut',
          animationDelay: undefined,
          animationIterationCount: 3,
          animationDirection: undefined,
          animationFillMode: 'both',
          animationPlayState: undefined,
        },
      ]);
    });
  });
});
