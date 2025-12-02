'use strict';
import { ReanimatedError } from '../../../errors';
import { ValueProcessorTarget } from '../../../types';
import type * as Colors from '../colors';
import { ERROR_MESSAGES, processColor, processColorsInProps } from '../colors';

type ColorsModule = Pick<
  typeof Colors,
  'DynamicColorIOS' | 'PlatformColor' | 'processColor' | 'processColorsInProps'
>;

function withMockedPlatform(
  platform: 'ios' | 'android',
  run: (mod: ColorsModule) => void
) {
  jest.isolateModules(() => {
    jest.doMock('../../../constants', () => {
      const actual = jest.requireActual('../../../constants');
      return {
        ...actual,
        IS_IOS: platform === 'ios',
        IS_ANDROID: platform === 'android',
      };
    });

    run(jest.requireActual('../colors'));
  });

  jest.resetModules();
  jest.dontMock('../../../constants');
}

describe(processColorsInProps, () => {
  describe('properly converts colors in props', () => {
    test.each([
      ['backgroundColor', 'red', 0xff0000ff],
      ['color', 'rgb(255, 200, 0)', 0xffc800ff],
      ['textDecorationColor', 'rgba(50, 100, 150, 0.6)', 0x32649699],
      ['textShadowColor', '#34a', 0x3344aaff],
      ['borderColor', '#123456', 0x123456ff],
      ['borderTopColor', '#abc', 0xaabbccff],
      ['borderBlockStartColor', '#ff5733', 0xff5733ff],
      ['borderRightColor', 'hsl(240, 100%, 50%)', 0x0000ffff],
      ['borderEndColor', 'hsla(120, 50%, 50%, 0.5)', 0x40bf4080],
      ['borderBottomColor', 'hwb(0, 0%, 0%)', 0xff0000ff],
      ['borderBlockEndColor', 'blue', 0x0000ffff],
      ['borderLeftColor', 'green', 0x008000ff],
      ['borderStartColor', 'rgb(0, 128, 255)', 0x0080ffff],
      ['borderBlockColor', 'rgba(255, 0, 128, 0.3)', 0xff00804d],
      ['shadowColor', '#00ff88', 0x00ff88ff],
      ['overlayColor', 'hsla(360, 100%, 50%, 0.75)', 0xff0000bf],
      ['tintColor', 'hsl(180, 100%, 25%)', 0x007f80ff],
    ])('converts %p with value %p to %p', (key, value, expected) => {
      // convert from RGBA to ARGB format
      const argb = ((expected << 24) | (expected >>> 8)) >>> 0;
      const props = { [key]: value };

      processColorsInProps(props);

      expect(props).toEqual({ [key]: argb });
    });
  });

  describe('does not convert non-color properties', () => {
    test.each([
      ['width', 'red'],
      ['height', 'blue'],
      ['margin', 0x000000ff],
      ['padding', '#ff0000'],
    ])('does not convert %p', (key, value) => {
      const props = { [key]: value };

      processColorsInProps(props);

      expect(props).toEqual({ [key]: value });
    });
  });

  describe('DynamicColorIOS support', () => {
    test('mutates dynamic colors on iOS', () => {
      withMockedPlatform(
        'ios',
        ({
          processColorsInProps: processColorsInProps_,
          DynamicColorIOS: DynamicIOS,
        }) => {
          const props = {
            backgroundColor: DynamicIOS({
              light: '#abcdef',
              dark: '#123456',
              highContrastDark: '#ff00ff',
            }),
          };

          processColorsInProps_(props);

          expect(props.backgroundColor).toEqual({
            dynamic: {
              light: 0xffabcdef,
              dark: 0xff123456,
              highContrastLight: undefined,
              highContrastDark: 0xffff00ff,
            },
          });
        }
      );
    });

    test('throws for dynamic colors on non-iOS platforms', () => {
      withMockedPlatform(
        'android',
        ({
          processColorsInProps: processColorsInProps_,
          DynamicColorIOS: DynamicIOS,
        }) => {
          const props = {
            backgroundColor: DynamicIOS({ light: '#ffffff', dark: '#000000' }),
          };

          expect(() => processColorsInProps_(props)).toThrow(
            new ReanimatedError(ERROR_MESSAGES.dynamicNotAvailableOnPlatform())
          );
        }
      );
    });
  });

  describe('PlatformColor support', () => {
    test.each(['ios', 'android'] as const)(
      'keeps PlatformColor values unchanged on %s',
      (platform) => {
        withMockedPlatform(
          platform,
          ({ processColorsInProps: processColorsInProps_, PlatformColor }) => {
            const platformColor = PlatformColor('systemBlue');
            const props = { backgroundColor: platformColor };

            processColorsInProps_(props);

            expect(props.backgroundColor).toBe(platformColor);
          }
        );
      }
    );
  });
});

describe(processColor, () => {
  describe('properly converts colors', () => {
    test.each([
      ['red', 0xff0000ff],
      ['rgb(255, 200, 0)', 0xffc800ff],
      ['rgba(50, 100, 150, 0.6)', 0x32649699],
      ['#34a', 0x3344aaff],
      ['hsl(240, 100%, 50%)', 0x0000ffff],
      ['hsla(120, 50%, 50%, 0.5)', 0x40bf4080],
      ['hwb(0, 0%, 0%)', 0xff0000ff],
      ['transparent', 0x00000000],
    ])('converts %p to %p', (value, expected) => {
      // convert from RGBA to ARGB format if not null
      const argb =
        typeof expected === 'number' &&
        ((expected << 24) | (expected >>> 8)) >>> 0;
      expect(processColor(value)).toEqual(argb);
    });

    test('returns false for transparent color with CSS target', () => {
      expect(
        processColor('transparent', { target: ValueProcessorTarget.CSS })
      ).toBe(false);
    });

    test('converts DynamicColorIOS values on iOS', () => {
      withMockedPlatform(
        'ios',
        ({ processColor: processColor_, DynamicColorIOS: DynamicIOS }) => {
          const dynamic = DynamicIOS({
            light: '#ffffff',
            dark: 'transparent',
            highContrastLight: '#ff0000',
          });
          const processed = processColor_(
            dynamic
          ) as Colors.ProcessedDynamicColorObjectIOS;

          expect(processed).toEqual({
            dynamic: {
              light: 0xffffffff,
              dark: 0x00000000,
              highContrastLight: 0xffff0000,
              highContrastDark: undefined,
            },
          });
        }
      );
    });

    test('throws for DynamicColorIOS on non-iOS platforms', () => {
      withMockedPlatform(
        'android',
        ({ processColor: processColor_, DynamicColorIOS: DynamicIOS }) => {
          const dynamic = DynamicIOS({ light: '#ffffff', dark: '#000000' });

          expect(() => processColor_(dynamic)).toThrow(
            new ReanimatedError(ERROR_MESSAGES.dynamicNotAvailableOnPlatform())
          );
        }
      );
    });

    test.each(['ios', 'android'] as const)(
      'returns PlatformColor values unchanged on %s',
      (platform) => {
        withMockedPlatform(
          platform,
          ({ processColor: processColor_, PlatformColor }) => {
            const platformColor = PlatformColor('systemBlue');

            expect(processColor_(platformColor)).toBe(platformColor);
          }
        );
      }
    );
  });

  describe('throws an error for invalid color values', () => {
    test.each([
      'invalid',
      '#1',
      'rgb(255, 255, 255, 0.5)',
      'rgba(255, 255, 255)',
      'hsl(360, 100%, 50%, 0.5)',
      'hsla(360, 100%, 50%)',
      'hwb(360, 100%, 50%, 0.5)',
    ])('throws an error for %p', (value) => {
      expect(() => processColor(value)).toThrow(
        new ReanimatedError(ERROR_MESSAGES.invalidColor(value))
      );
    });

    test('throws when DynamicColorIOS is nested inside another DynamicColorIOS', () => {
      withMockedPlatform(
        'ios',
        ({ processColor: processColor_, DynamicColorIOS: DynamicIOS }) => {
          const nested = DynamicIOS({
            light: DynamicIOS({
              light: '#ffffff',
              dark: '#000000',
            }) as unknown as string,
            dark: '#000000',
          });

          expect(() => processColor_(nested)).toThrow(
            new ReanimatedError(ERROR_MESSAGES.invalidColor(nested))
          );
        }
      );
    });
  });
});
