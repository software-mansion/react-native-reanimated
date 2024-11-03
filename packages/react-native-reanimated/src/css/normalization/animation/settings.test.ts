import { ReanimatedError } from '../../../errors';
import { cubicBezier } from '../../easing';
import type {
  CSSAnimationDirection,
  CSSAnimationFillMode,
  CSSAnimationIterationCount,
  CSSAnimationPlayState,
  CSSAnimationSettings,
  NormalizedCSSAnimationSettings,
} from '../../types';
import {
  VALID_ANIMATION_DIRECTIONS,
  VALID_FILL_MODES,
  VALID_PLAY_STATES,
} from './constants';
import {
  ERROR_MESSAGES,
  getNormalizedCSSAnimationSettingsUpdates,
  normalizeDirection,
  normalizeFillMode,
  normalizeIterationCount,
  normalizePlayState,
} from './settings';

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

describe(getNormalizedCSSAnimationSettingsUpdates, () => {
  it('returns empty object when settings do not change', () => {
    const settings: CSSAnimationSettings = {
      animationDuration: 1000,
      animationTimingFunction: 'ease',
      animationDirection: 'normal',
      animationIterationCount: 1,
      animationFillMode: 'none',
      animationPlayState: 'running',
    };

    expect(
      getNormalizedCSSAnimationSettingsUpdates(settings, { ...settings })
    ).toEqual({});
  });

  describe('when settings change', () => {
    const oldSettings: CSSAnimationSettings = {
      animationDuration: 1000,
      animationTimingFunction: 'ease',
      animationDirection: 'normal',
      animationIterationCount: 1,
      animationFillMode: 'none',
      animationPlayState: 'running',
    };

    it.each([
      [{ animationDuration: 2000 }, { animationDuration: 2000 }],
      [
        { animationTimingFunction: cubicBezier(0.4, 0, 0.2, 1) },
        { animationTimingFunction: cubicBezier(0.4, 0, 0.2, 1).normalize() },
      ],
      [{ animationDirection: 'reverse' }, { animationDirection: 'reverse' }],
      [{ animationIterationCount: 2 }, { animationIterationCount: 2 }],
      [{ animationFillMode: 'forwards' }, { animationFillMode: 'forwards' }],
      [{ animationPlayState: 'paused' }, { animationPlayState: 'paused' }],
      [
        {
          animationDuration: 2000,
          animationTimingFunction: 'easeIn',
          animationDirection: 'reverse',
          animationIterationCount: 2,
          animationFillMode: 'forwards',
          animationPlayState: 'paused',
        },
        {
          animationDuration: 2000,
          animationTimingFunction: 'easeIn',
          animationDirection: 'reverse',
          animationIterationCount: 2,
          animationFillMode: 'forwards',
          animationPlayState: 'paused',
        },
      ],
    ] satisfies [
      Partial<CSSAnimationSettings>,
      Partial<NormalizedCSSAnimationSettings>,
    ][])('returns updates for change %p', (updates, expected) => {
      expect(
        getNormalizedCSSAnimationSettingsUpdates(oldSettings, {
          ...oldSettings,
          ...updates,
        })
      ).toEqual(expected);
    });
  });
});
