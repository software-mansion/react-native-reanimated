'use strict';
import type {
  CSSTimingFunction,
  PredefinedTimingFunction,
} from '../../../../../easings';
import { cubicBezier, linear, steps } from '../../../../../easings';
import { ReanimatedError } from '../../../../../errors';
import type { TimeUnit } from '../../../../../types';
import {
  ERROR_MESSAGES,
  normalizeDelay,
  normalizeDuration,
  normalizeTimingFunction,
  VALID_PREDEFINED_TIMING_FUNCTIONS,
} from '../settings';

type TestCases = [TimeUnit, number][];

describe(normalizeDelay, () => {
  it('returns 0 by default', () => {
    expect(normalizeDelay()).toBe(0);
  });

  describe('when number is passed', () => {
    it.each([100, 0, -100])('returns %p', (delay) => {
      expect(normalizeDelay(delay)).toBe(delay);
    });
  });

  describe('when milliseconds are passed', () => {
    it.each([
      ['100ms', 100],
      ['0ms', 0],
      ['-100ms', -100],
    ] satisfies TestCases)('converts %p to %p', (delay, expected) => {
      expect(normalizeDelay(delay)).toBe(expected);
    });
  });

  describe('when seconds are passed', () => {
    it.each([
      ['1s', 1000],
      ['0.1s', 100],
      ['-1s', -1000],
    ] satisfies TestCases)('converts %p to %p', (delay, expected) => {
      expect(normalizeDelay(delay)).toBe(expected);
    });
  });

  describe('when invalid value is passed', () => {
    it.each(['invalid', 'mss', '100mms', '1', '1.1', ''])(
      'throws an error for %p',
      (delay) => {
        const value = delay as TimeUnit;
        expect(() => normalizeDelay(value)).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidDelay(value))
        );
      }
    );
  });
});

describe(normalizeDuration, () => {
  it('returns 0 by default', () => {
    expect(normalizeDuration()).toBe(0);
  });

  describe('when number is passed', () => {
    it.each([100, 0])('returns %p', (duration) => {
      expect(normalizeDuration(duration)).toBe(duration);
    });
  });

  describe('when milliseconds are passed', () => {
    it.each([
      ['100ms', 100],
      ['0ms', 0],
    ] satisfies TestCases)('converts %p to %p', (duration, expected) => {
      expect(normalizeDuration(duration)).toBe(expected);
    });
  });

  describe('when seconds are passed', () => {
    it.each([
      ['1s', 1000],
      ['0.1s', 100],
    ] satisfies TestCases)('converts %p to %p', (duration, expected) => {
      expect(normalizeDuration(duration)).toBe(expected);
    });
  });

  describe('when invalid value is passed', () => {
    it.each(['invalid', 'mss', '100mms', '1', '1.1', ''])(
      'throws an error for %p',
      (duration) => {
        const value = duration as TimeUnit;
        expect(() => normalizeDuration(value)).toThrow(
          new ReanimatedError(ERROR_MESSAGES.invalidDuration(value))
        );
      }
    );
  });

  describe('when negative duration is passed', () => {
    it.each(['-100ms', '-1s', -100])('throws an error for %p', (duration) => {
      const value = duration as TimeUnit;
      expect(() => normalizeDuration(value)).toThrow(
        new ReanimatedError(ERROR_MESSAGES.negativeDuration(value))
      );
    });
  });
});

describe(normalizeTimingFunction, () => {
  it('returns "ease" by default', () => {
    expect(normalizeTimingFunction()).toBe('ease');
  });

  describe('predefined timing function', () => {
    describe('when valid function is passed', () => {
      it.each([...VALID_PREDEFINED_TIMING_FUNCTIONS])(
        'returns %p',
        (timingFunction) => {
          expect(normalizeTimingFunction(timingFunction)).toBe(timingFunction);
        }
      );
    });

    describe('when invalid function is passed', () => {
      it.each(['invalid', 'ease-in', 'ease-out', ''])(
        'throws an error for %p',
        (timingFunction) => {
          const value = timingFunction as PredefinedTimingFunction;
          expect(() => normalizeTimingFunction(value)).toThrow(
            new ReanimatedError(
              ERROR_MESSAGES.invalidPredefinedTimingFunction(value)
            )
          );
        }
      );
    });
  });

  describe('parametrized timing function', () => {
    describe('when valid function is passed', () => {
      it.each([
        cubicBezier(0.25, 0.1, 0.25, 1),
        cubicBezier(0.42, 0, 1, 1),
        linear(0, [0.25, '75%'], 1),
        linear([0.6, '0%'], [0.1, '50%'], [1, '100%']),
        steps(4, 'start'),
        steps(2, 'end'),
        steps(5, 'jump-none'),
      ])('returns normalized value for %p', (timingFunction) => {
        expect(normalizeTimingFunction(timingFunction)).toEqual(
          timingFunction.normalize()
        );
      });
    });

    describe('when invalid function is passed', () => {
      it.each([() => 'invalid', () => 0, {}, []])(
        'throws an error for %p',
        (timingFunction) => {
          const value = timingFunction as CSSTimingFunction;
          expect(() => normalizeTimingFunction(value)).toThrow(
            new ReanimatedError(
              ERROR_MESSAGES.invalidParametrizedTimingFunction(value)
            )
          );
        }
      );
    });
  });
});
