'use strict';
import { ReanimatedError } from '../../../../../common';
import { cubicBezier } from '../../../../easing';
import type {
  CSSAnimationDirection,
  CSSAnimationFillMode,
  CSSAnimationIterationCount,
  CSSAnimationPlayState,
} from '../../../../types';
import type { NormalizedSingleCSSAnimationSettings } from '../../../types';
import {
  VALID_ANIMATION_DIRECTIONS,
  VALID_FILL_MODES,
  VALID_PLAY_STATES,
} from '../constants';
import {
  ERROR_MESSAGES,
  getAnimationSettingsUpdates,
  normalizeDirection,
  normalizeFillMode,
  normalizeIterationCount,
  normalizePlayState,
  normalizeSingleCSSAnimationSettings,
} from '../settings';

describe(normalizeDirection, () => {
  test('returns "normal" by default', () => {
    expect(normalizeDirection()).toBe('normal');
  });

  describe('when valid value is passed', () => {
    test.each([...VALID_ANIMATION_DIRECTIONS])('returns %p', (direction) => {
      expect(normalizeDirection(direction)).toBe(direction);
    });
  });

  describe('when invalid value is passed', () => {
    test.each(['invalid', 'normal ', 'alternateReverse'])(
      'throws an error for %p',
      (direction) => {
        const value = direction as CSSAnimationDirection;
        expect(() => normalizeDirection(value)).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidAnimationDirection(value))
        );
      }
    );
  });
});

describe(normalizeIterationCount, () => {
  test('returns 1 by default', () => {
    expect(normalizeIterationCount()).toBe(1);
  });

  describe('when number is passed', () => {
    test.each([0, 1, 2.5, 5])('returns %p', (iterationCount) => {
      expect(normalizeIterationCount(iterationCount)).toBe(iterationCount);
    });

    test('returns "-1" for Infinity', () => {
      expect(normalizeIterationCount(Infinity)).toBe(-1);
    });
  });

  describe('when "infinite" is passed', () => {
    test('returns -1', () => {
      expect(normalizeIterationCount('infinite')).toBe(-1);
    });
  });

  describe('when invalid value is passed', () => {
    test.each(['invalid', 'infinite '])(
      'throws an error for %p',
      (iterationCount) => {
        const value = iterationCount as CSSAnimationIterationCount;
        expect(() => normalizeIterationCount(value)).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidIterationCount(value))
        );
      }
    );
  });

  describe('when negative number is passed', () => {
    test('throws an error', () => {
      expect(() => normalizeIterationCount(-1)).toThrow(
        new ReanimatedError(ERROR_MESSAGES.negativeIterationCount(-1))
      );
    });
  });
});

describe(normalizeFillMode, () => {
  test('returns "none" by default', () => {
    expect(normalizeFillMode()).toBe('none');
  });

  describe('when valid value is passed', () => {
    test.each([...VALID_FILL_MODES])('returns %p', (fillMode) => {
      expect(normalizeFillMode(fillMode)).toBe(fillMode);
    });
  });

  describe('when invalid value is passed', () => {
    test.each(['invalid', 'none '])('throws an error for %p', (fillMode) => {
      const value = fillMode as CSSAnimationFillMode;
      expect(() => normalizeFillMode(value)).toThrow(
        new ReanimatedError(ERROR_MESSAGES.invalidFillMode(value))
      );
    });
  });
});

describe(normalizePlayState, () => {
  test('returns "running" by default', () => {
    expect(normalizePlayState()).toBe('running');
  });

  describe('when valid value is passed', () => {
    test.each([...VALID_PLAY_STATES])('returns %p', (playState) => {
      expect(normalizePlayState(playState)).toBe(playState);
    });
  });

  describe('when invalid value is passed', () => {
    test.each(['invalid', 'running '])(
      'throws an error for %p',
      (playState) => {
        const value = playState as CSSAnimationPlayState;
        expect(() => normalizePlayState(value)).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidPlayState(value))
        );
      }
    );
  });
});

describe(normalizeSingleCSSAnimationSettings, () => {
  test('fills missing values with defaults', () => {
    expect(normalizeSingleCSSAnimationSettings({})).toEqual({
      duration: 0,
      timingFunction: 'ease',
      delay: 0,
      iterationCount: 1,
      direction: 'normal',
      fillMode: 'none',
      playState: 'running',
    });
  });

  test('returns normalized settings', () => {
    expect(
      normalizeSingleCSSAnimationSettings({
        animationDuration: '3.5s',
        animationTimingFunction: cubicBezier(0.4, 0, 0.2, 1),
        animationDelay: '100ms',
        animationDirection: 'reverse',
        animationFillMode: 'forwards',
        animationPlayState: 'paused',
        animationIterationCount: Infinity,
      })
    ).toEqual({
      duration: 3500,
      timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
      delay: 100,
      iterationCount: -1, // -1 is used for infinite
      direction: 'reverse',
      fillMode: 'forwards',
      playState: 'paused',
    });
  });
});

describe(getAnimationSettingsUpdates, () => {
  test('returns an empty object if no settings are changed', () => {
    const settings: NormalizedSingleCSSAnimationSettings = {
      duration: 1000,
      timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize(),
      delay: 0,
      direction: 'normal',
      iterationCount: 1,
      fillMode: 'none',
      playState: 'running',
    };

    expect(getAnimationSettingsUpdates(settings, { ...settings })).toEqual({});
  });

  describe('when settings change', () => {
    const oldSettings: NormalizedSingleCSSAnimationSettings = {
      duration: 1000,
      timingFunction: 'ease',
      delay: 0,
      direction: 'normal',
      iterationCount: 1,
      fillMode: 'none',
      playState: 'running',
    };

    test.each([
      { duration: 2000 },
      { timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize() },
      { direction: 'reverse' },
      { iterationCount: 2 },
      { fillMode: 'forwards' },
      { playState: 'paused' },
      {
        duration: 2000,
        timingFunction: 'ease-in',
        direction: 'reverse',
        iterationCount: 2,
        fillMode: 'forwards',
        playState: 'paused',
      },
    ] satisfies Partial<NormalizedSingleCSSAnimationSettings>[])(
      'returns updates for change %p',
      (updates) => {
        expect(
          getAnimationSettingsUpdates(oldSettings, {
            ...oldSettings,
            ...updates,
          })
        ).toEqual(updates);
      }
    );
  });
});
