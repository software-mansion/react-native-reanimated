'use strict';
import { logger } from '../../../logger';
import { WARN_MESSAGES } from '../../processStyleValue';
import {
  DynamicColorIOS,
  ERROR_MESSAGES,
  PlatformColor,
  processColor,
  processColorsInProps,
} from '../colors';

const warn = jest.fn();
logger.warn = warn;

describe('DynamicColorIOS support on Android', () => {
  test('processColorsInProps ignores DynamicColorIOS with a warning', () => {
    const props = {
      opacity: 0.5,
      backgroundColor: DynamicColorIOS({ light: '#ffffff', dark: '#000000' }),
    };

    processColorsInProps(props);

    expect(props).toEqual({ opacity: 0.5 });
    expect(warn).toHaveBeenCalledWith(
      WARN_MESSAGES.ignoredValue(
        ERROR_MESSAGES.dynamicNotAvailableOnPlatform()
      ),
      { strict: true }
    );
  });

  test('processColor throws for DynamicColorIOS', () => {
    const dynamic = DynamicColorIOS({ light: '#ffffff', dark: '#000000' });

    expect(() => processColor(dynamic)).toThrow(
      new Error(
        `[Reanimated] ${ERROR_MESSAGES.dynamicNotAvailableOnPlatform()}`
      )
    );
  });
});

describe('PlatformColor on Android', () => {
  test('processColorsInProps keeps PlatformColor', () => {
    const platformColor = PlatformColor('systemBlue');
    const props = { backgroundColor: platformColor };

    processColorsInProps(props);

    expect(props.backgroundColor).toBe(platformColor);
  });

  test('processColor returns PlatformColor without change', () => {
    const platformColor = PlatformColor('systemBlue');

    expect(processColor(platformColor)).toBe(platformColor);
  });
});
