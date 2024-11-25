import { ReanimatedError } from '../../../errors';
import { cubicBezier } from '../../easing';
import type { CSSAnimationConfig, CSSAnimationKeyframes } from '../../types';
import { normalizeCSSAnimationConfig, ERROR_MESSAGES } from './config';

describe(normalizeCSSAnimationConfig, () => {
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

    expect(normalizeCSSAnimationConfig(config)).toEqual({
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
    });
  });

  it('uses default values for unspecified properties', () => {
    const config: CSSAnimationConfig = {
      animationName: { from: { opacity: 1 }, to: { opacity: 0.5 } },
    };

    expect(normalizeCSSAnimationConfig(config)).toEqual({
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
    });
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
