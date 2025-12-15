'use strict';
import { ReanimatedError } from '../../../errors';
import {
  DynamicColorIOS,
  ERROR_MESSAGES,
  PlatformColor,
  processColor,
} from '../colors';

describe('DynamicColorIOS support on Android', () => {
  test('processColor throws for DynamicColorIOS', () => {
    const dynamicColor = DynamicColorIOS({ light: '#ffffff', dark: '#000000' });

    expect(() => processColor(dynamicColor)).toThrow(
      new ReanimatedError(ERROR_MESSAGES.dynamicNotAvailableOnPlatform())
    );
  });
});

describe('PlatformColor on Android', () => {
  test('processColor returns PlatformColor without change', () => {
    const platformColor = PlatformColor('systemBlue');

    expect(processColor(platformColor)).toBe(platformColor);
  });
});
