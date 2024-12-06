import { cubicBezier } from '../../../easings';
import { ReanimatedError } from '../../../errors';
import type {
  CSSAnimationDirection,
  CSSAnimationFillMode,
  CSSAnimationIterationCount,
  CSSAnimationPlayState,
  NormalizedSingleCSSAnimationSettings,
} from '../../../types';
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
} from '../settings';

describe(normalizeDirection, () => {
  it('returns "normal" by default', () => {
    expect(normalizeDirection()).toBe('normal');
  });

  describe('when valid value is passed', () => {
    it.each([...VALID_ANIMATION_DIRECTIONS])('returns %p', (direction) => {
      expect(normalizeDirection(direction)).toBe(direction);
    });
  });

  describe('when invalid value is passed', () => {
    it.each(['invalid', 'normal ', 'alternate-reverse'])(
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
  it('returns 1 by default', () => {
    expect(normalizeIterationCount()).toBe(1);
  });

  describe('when number is passed', () => {
    it.each([0, 1, 2.5, 5])('returns %p', (iterationCount) => {
      expect(normalizeIterationCount(iterationCount)).toBe(iterationCount);
    });

    it('returns "-1" for Infinity', () => {
      expect(normalizeIterationCount(Infinity)).toBe(-1);
    });
  });

  describe('when "infinite" is passed', () => {
    it('returns -1', () => {
      expect(normalizeIterationCount('infinite')).toBe(-1);
    });
  });

  describe('when invalid value is passed', () => {
    it.each(['invalid', 'infinite '])(
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
    it('throws an error', () => {
      expect(() => normalizeIterationCount(-1)).toThrow(
        new ReanimatedError(ERROR_MESSAGES.negativeIterationCount(-1))
      );
    });
  });
});

describe(normalizeFillMode, () => {
  it('returns "none" by default', () => {
    expect(normalizeFillMode()).toBe('none');
  });

  describe('when valid value is passed', () => {
    it.each([...VALID_FILL_MODES])('returns %p', (fillMode) => {
      expect(normalizeFillMode(fillMode)).toBe(fillMode);
    });
  });

  describe('when invalid value is passed', () => {
    it.each(['invalid', 'none '])('throws an error for %p', (fillMode) => {
      const value = fillMode as CSSAnimationFillMode;
      expect(() => normalizeFillMode(value)).toThrow(
        new ReanimatedError(ERROR_MESSAGES.invalidFillMode(value))
      );
    });
  });
});

describe(normalizePlayState, () => {
  it('returns "running" by default', () => {
    expect(normalizePlayState()).toBe('running');
  });

  describe('when valid value is passed', () => {
    it.each([...VALID_PLAY_STATES])('returns %p', (playState) => {
      expect(normalizePlayState(playState)).toBe(playState);
    });
  });

  describe('when invalid value is passed', () => {
    it.each(['invalid', 'running '])('throws an error for %p', (playState) => {
      const value = playState as CSSAnimationPlayState;
      expect(() => normalizePlayState(value)).toThrow(
        new ReanimatedError(ERROR_MESSAGES.invalidPlayState(value))
      );
    });
  });
});

describe(getAnimationSettingsUpdates, () => {
  it('returns an empty object if no settings are changed', () => {
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

    it.each([
      { duration: 2000 },
      { timingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize() },
      { direction: 'reverse' },
      { iterationCount: 2 },
      { fillMode: 'forwards' },
      { playState: 'paused' },
      {
        duration: 2000,
        timingFunction: 'easeIn',
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
