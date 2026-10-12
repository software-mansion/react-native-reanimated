'use strict';
import { logger } from '../../logger';
import { processTransform } from '../processors';
import {
  processStylePropInPlace,
  warnIgnoredStyleValue,
  WARN_MESSAGES,
} from '../processStyleValue';

const warn = jest.fn();
logger.warn = warn;

describe(warnIgnoredStyleValue, () => {
  afterEach(() => {
    warn.mockClear();
  });

  test('warns with the error message without its prefix', () => {
    warnIgnoredStyleValue(new Error('[Reanimated] Invalid value: nope'));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      WARN_MESSAGES.ignoredValue('Invalid value: nope'),
      { strict: true }
    );
  });

  test('warns with a value thrown that is not an error', () => {
    warnIgnoredStyleValue('Invalid value: nope');

    expect(warn).toHaveBeenCalledWith(
      WARN_MESSAGES.ignoredValue('Invalid value: nope'),
      { strict: true }
    );
  });

  test('does not warn outside development', () => {
    const globalWithDev = globalThis as unknown as { __DEV__: boolean };
    const originalDev = globalWithDev.__DEV__;
    globalWithDev.__DEV__ = false;
    try {
      warnIgnoredStyleValue(new Error('[Reanimated] Invalid value: nope'));
      expect(warn).not.toHaveBeenCalled();
    } finally {
      globalWithDev.__DEV__ = originalDev;
    }
  });
});

describe(processStylePropInPlace, () => {
  afterEach(() => {
    warn.mockClear();
  });

  test('replaces the value with the processed one', () => {
    const props = { opacity: 1, transform: ' rotate(45deg) ' };

    processStylePropInPlace(props, 'transform', processTransform);

    expect(props).toEqual({ opacity: 1, transform: [{ rotate: '45deg' }] });
  });

  test('removes a rejected value so the prop keeps its current value', () => {
    const props = { opacity: 1, transform: 'spin(45deg)' };

    processStylePropInPlace(props, 'transform', processTransform);

    expect(props).toEqual({ opacity: 1 });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test('keeps null without processing it', () => {
    const props = { backgroundColor: null };

    processStylePropInPlace(props, 'backgroundColor', () => {
      throw new Error('[Reanimated] should not be called');
    });

    expect(props).toEqual({ backgroundColor: null });
    expect(warn).not.toHaveBeenCalled();
  });

  test('keeps an undefined result, which clears the prop', () => {
    const props = { boxShadow: 'none' };

    processStylePropInPlace(props, 'boxShadow', () => undefined);

    expect(props).toEqual({ boxShadow: undefined });
    expect('boxShadow' in props).toBe(true);
  });
});
