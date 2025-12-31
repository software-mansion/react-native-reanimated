'use strict';
import { ReanimatedError } from '../../../common';
import {
  DynamicColorIOS,
  ERROR_MESSAGES,
  PlatformColor,
  processColor,
  processColorsInProps,
} from '../colorProcessing';

describe('DynamicColorIOS support on Android', () => {
  test('processColorsInProps throws for DynamicColorIOS', () => {
    const props = {
      backgroundColor: DynamicColorIOS({ light: '#ffffff', dark: '#000000' }),
    };

    expect(() => processColorsInProps(props)).toThrow(
      new ReanimatedError(ERROR_MESSAGES.dynamicNotAvailableOnPlatform())
    );
  });

  test('processColor throws for DynamicColorIOS', () => {
    const dynamic = DynamicColorIOS({ light: '#ffffff', dark: '#000000' });

    expect(() => processColor(dynamic)).toThrow(
      new ReanimatedError(ERROR_MESSAGES.dynamicNotAvailableOnPlatform())
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
