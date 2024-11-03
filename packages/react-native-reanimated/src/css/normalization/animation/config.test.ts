import { ReanimatedError } from '../../../errors';
import { cubicBezier } from '../../easing';
import type { CSSAnimationConfig, CSSAnimationKeyframes } from '../../types';
import { normalizeCSSAnimationConfig } from './config';
import { ERROR_MESSAGES } from './config';

describe(normalizeCSSAnimationConfig, () => {
  it('normalizes animation config', () => {
    const animationTimingFunction = cubicBezier(0.4, 0, 0.2, 1);
    const config: CSSAnimationConfig = {
      animationName: { from: { opacity: 1 }, to: { opacity: 0.5 } },
      animationDuration: '1.5s',
      animationTimingFunction,
      animationDelay: '300ms',
      animationIterationCount: 3,
      animationDirection: 'reverse',
      animationFillMode: 'both',
      animationPlayState: 'paused',
    };

    expect(normalizeCSSAnimationConfig(config)).toEqual({
      animationName: {
        opacity: [
          { offset: 0, value: 1 },
          { offset: 1, value: 0.5 },
        ],
      },
      animationDuration: 1500,
      animationTimingFunction: animationTimingFunction.normalize(),
      animationDelay: 300,
      animationIterationCount: 3,
      animationDirection: 'reverse',
      animationFillMode: 'both',
      animationPlayState: 'paused',
    });
  });

  it('uses default values for unspecified properties', () => {
    const config: CSSAnimationConfig = {
      animationName: { from: { opacity: 1 }, to: { opacity: 0.5 } },
    };

    expect(normalizeCSSAnimationConfig(config)).toEqual({
      animationName: {
        opacity: [
          { offset: 0, value: 1 },
          { offset: 1, value: 0.5 },
        ],
      },
      animationDuration: 0,
      animationTimingFunction: 'ease',
      animationDelay: 0,
      animationIterationCount: 1,
      animationDirection: 'normal',
      animationFillMode: 'none',
      animationPlayState: 'running',
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
