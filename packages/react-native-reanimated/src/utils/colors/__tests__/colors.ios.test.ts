'use strict';
import { ReanimatedError } from '../../../common';
import type { ProcessedDynamicColorObjectIOS } from '../colorProcessing';
import {
  DynamicColorIOS,
  ERROR_MESSAGES,
  PlatformColor,
  processColor,
  processColorsInProps,
} from '../colorProcessing';

describe('DynamicColorIOS support on iOS', () => {
  test('mutates dynamic colors in props', () => {
    const props = {
      backgroundColor: DynamicColorIOS({
        light: '#abcdef',
        dark: '#123456',
        highContrastDark: '#ff00ff',
      }),
    };

    processColorsInProps(props);

    expect(props.backgroundColor).toEqual({
      dynamic: {
        light: 0xffabcdef,
        dark: 0xff123456,
        highContrastLight: undefined,
        highContrastDark: 0xffff00ff,
      },
    });
  });

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
