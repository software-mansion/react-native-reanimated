'use strict';
import { ReanimatedError } from '../../../errors';
import type { ProcessedDynamicColorObjectIOS } from '../colors';
import {
  DynamicColorIOS,
  ERROR_MESSAGES,
  PlatformColor,
  processColor,
} from '../colors';

describe('DynamicColorIOS support on iOS', () => {
  test('processColor converts DynamicColorIOS values', () => {
    const dynamic = DynamicColorIOS({
      light: '#ffffff',
      dark: 'transparent',
      highContrastLight: '#ff0000',
    });

    const processed = processColor(dynamic) as ProcessedDynamicColorObjectIOS;

    expect(processed).toEqual({
      dynamic: {
        light: 0xffffffff,
        dark: 0x00000000,
        highContrastLight: 0xffff0000,
        highContrastDark: undefined,
      },
    });
  });

  test('throws when DynamicColorIOS is nested', () => {
    const nested = DynamicColorIOS({
      light: DynamicColorIOS({
        light: '#ffffff',
        dark: '#000000',
      }) as unknown as string,
      dark: '#000000',
    });

    expect(() => processColor(nested)).toThrow(
      new ReanimatedError(ERROR_MESSAGES.invalidColor(nested))
    );
  });
});

describe('PlatformColor on iOS', () => {
  test('processColor returns PlatformColor without change', () => {
    const platformColor = PlatformColor('systemBlue');

    expect(processColor(platformColor)).toBe(platformColor);
  });
});
