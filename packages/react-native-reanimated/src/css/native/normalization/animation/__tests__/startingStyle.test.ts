'use strict';
import { CSSKeyframesRuleImpl } from '../../../keyframes';
import { getAnimationsStartingStyle } from '../startingStyle';

const FADE_IN = {
  from: { opacity: 0 },
  to: { opacity: 1 },
};

describe(getAnimationsStartingStyle, () => {
  test('returns the first keyframe of an animation that starts at once', () => {
    expect(
      getAnimationsStartingStyle({
        animationName: FADE_IN,
        animationDuration: '1s',
      })
    ).toEqual({ opacity: 0 });
  });

  test('accepts CSSKeyframesRule instances', () => {
    expect(
      getAnimationsStartingStyle({
        animationName: new CSSKeyframesRuleImpl(FADE_IN),
        animationDuration: '1s',
      })
    ).toEqual({ opacity: 0 });
  });

  test('merges every selector that covers the first offset', () => {
    expect(
      getAnimationsStartingStyle({
        animationName: {
          '0%, 50%': { width: 10 },
          0: { height: 20, animationTimingFunction: 'linear' },
          '100%': { width: 100 },
        },
        animationDuration: '1s',
      })
    ).toEqual({ width: 10, height: 20 });
  });

  test('parses transform strings into the array form React Native accepts', () => {
    expect(
      getAnimationsStartingStyle({
        animationName: {
          from: { transform: 'translate(0, 0) scale(1, 1)' },
          to: { transform: 'translate(10, 0) scale(2, 0.5)' },
        },
        animationDuration: '1s',
      })
    ).toEqual({
      transform: [
        { translateX: 0 },
        { translateY: 0 },
        { scaleX: 1 },
        { scaleY: 1 },
      ],
    });
  });

  test('returns the last keyframe for reversed directions', () => {
    expect(
      getAnimationsStartingStyle({
        animationName: FADE_IN,
        animationDuration: '1s',
        animationDirection: 'alternate-reverse',
      })
    ).toEqual({ opacity: 1 });
  });

  test('returns the backwards fill of a delayed animation', () => {
    expect(
      getAnimationsStartingStyle({
        animationName: {
          from: { display: 'none', transform: [{ translateY: '-100%' }] },
        },
        animationDelay: '1s',
        animationFillMode: 'both',
      })
    ).toEqual({ display: 'none', transform: [{ translateY: '-100%' }] });
  });

  test('returns null for a delayed animation without backwards fill', () => {
    expect(
      getAnimationsStartingStyle({
        animationName: FADE_IN,
        animationDelay: '1s',
      })
    ).toBeNull();
  });

  test('returns null for a negative delay', () => {
    expect(
      getAnimationsStartingStyle({
        animationName: FADE_IN,
        animationDelay: '-500ms',
      })
    ).toBeNull();
  });

  test('returns null for a run that is over before its first frame', () => {
    expect(
      getAnimationsStartingStyle({
        animationName: FADE_IN,
        animationDuration: 0,
      })
    ).toBeNull();
    expect(
      getAnimationsStartingStyle({
        animationName: FADE_IN,
        animationIterationCount: 0,
      })
    ).toBeNull();
    expect(
      getAnimationsStartingStyle({
        animationName: FADE_IN,
        animationDelay: '1s',
        animationIterationCount: 0,
        animationFillMode: 'backwards',
      })
    ).toEqual({ opacity: 0 });
  });

  test('returns null when the first keyframe is implicit', () => {
    expect(
      getAnimationsStartingStyle({
        animationName: { to: { opacity: 1 } },
        animationDuration: '1s',
      })
    ).toBeNull();
  });

  test('lets later animations override earlier ones', () => {
    expect(
      getAnimationsStartingStyle({
        animationName: [FADE_IN, { from: { opacity: 0.5, width: 10 } }],
        animationDuration: ['1s', '2s'],
      })
    ).toEqual({ opacity: 0.5, width: 10 });
  });

  test('skips animations that do not apply at start', () => {
    expect(
      getAnimationsStartingStyle({
        animationName: [FADE_IN, { from: { width: 10 } }],
        animationDuration: '1s',
        animationDelay: ['1s', '0s'],
      })
    ).toEqual({ width: 10 });
  });
});
