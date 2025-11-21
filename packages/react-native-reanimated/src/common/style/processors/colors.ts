'use strict';
'worklet';
import type {
  ColorValue,
  DynamicColorIOS as RNDynamicColorIOS,
} from 'react-native';

import { ColorProperties, processColorInitially } from '../../../Colors';
import type { StyleProps } from '../../../commonTypes';
import { IS_ANDROID, IS_IOS } from '../../constants';
import { ReanimatedError } from '../../errors';
import type { Maybe } from '../../types';

type DynamicColorIOSTuple = Parameters<typeof RNDynamicColorIOS>[0];

type DynamicColorChannels = {
  light: ColorValue;
  dark: ColorValue;
  highContrastLight?: ColorValue;
  highContrastDark?: ColorValue;
};

type ProcessedDynamicColorChannels = {
  light: Maybe<number>;
  dark: Maybe<number>;
  highContrastLight?: Maybe<number>;
  highContrastDark?: Maybe<number>;
};

export type DynamicColorValue = {
  dynamic: DynamicColorChannels;
};

export type ProcessedDynamicColor = {
  dynamic: ProcessedDynamicColorChannels;
};

export type ProcessedColor = number | ProcessedDynamicColor;

type PlatformColorValue = ColorValue & { semantic?: Array<string> } & {
  resource_paths?: Array<string>;
};

export function PlatformColor(...names: Array<string>): PlatformColorValue {
  'worklet';
  // eslint-disable-next-line camelcase
  const mapped = IS_IOS ? { semantic: names } : { resource_paths: names };
  return mapped as PlatformColorValue;
}

function isPlatformColorObject(value: unknown): value is PlatformColorValue {
  return (
    !!value &&
    typeof value === 'object' &&
    (('semantic' in value && Array.isArray((value as any).semantic)) ||
      ('resource_paths' in value && Array.isArray((value as any).resource_paths)))
  );
}

/* copied from:
 * https://github.com/facebook/react-native/blob/v0.81.0/packages/react-native/Libraries/StyleSheet/PlatformColorValueTypesIOS.d.ts
 */
const DynamicColorIOSProperties = [
  'light',
  'dark',
  'highContrastLight',
  'highContrastDark',
] as const;

export function DynamicColorIOS(tuple: DynamicColorIOSTuple): DynamicColorValue {
  'worklet';
  return {
    dynamic: {
      light: tuple.light,
      dark: tuple.dark,
      highContrastLight: tuple.highContrastLight,
      highContrastDark: tuple.highContrastDark,
    },
  } as DynamicColorValue;
}

function isDynamicColorObject(value: unknown): value is DynamicColorValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'dynamic' in value &&
    DynamicColorIOSProperties.some((key) =>
      key in (value as { dynamic: Record<string, unknown> }).dynamic
    )
  );
}

/**
 * Processes a color value and returns a normalized color representation.
 *
 * @param value - The color value to process (string, number, or ColorValue)
 * @returns The processed color value - `number` for valid colors, `false` for
 *   transparent colors
 */
function processColorToNumber(value: unknown): number {
  let normalizedColor = processColorInitially(value);

  if (IS_ANDROID && typeof normalizedColor == 'number') {
    // Android use 32 bit *signed* integer to represent the color
    // We utilize the fact that bitwise operations in JS also operates on
    // signed 32 bit integers, so that we can use those to convert from
    // *unsigned* to *signed* 32bit int that way.
    normalizedColor = normalizedColor | 0x0;
  }

  if (normalizedColor === null) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidColor(value));
  }

  // The normalizedColor can be a boolean false value for the transparent color, but
  // we can safely cast it to number. Since boolean false is essentially 0, it can be
  // used in all numeric operations without issues. We use a boolean false value to
  // distinguish the transparent color from other colors.
  return normalizedColor as number;
}

export const ERROR_MESSAGES = {
  invalidColor: (color: unknown) =>
    `Invalid color value: ${JSON.stringify(color)}`,
};

function processDynamicColor(value: DynamicColorValue): ProcessedDynamicColor {
  if (!IS_IOS) {
    throw new ReanimatedError('DynamicColorIOS is not available on this platform.');
  }

  const channels = value.dynamic;
  const normalizeChannel = (channel: ColorValue | undefined): Maybe<number> =>
    channel === undefined ? undefined : processColorToNumber(channel);

  return {
    dynamic: {
      light: processColorToNumber(channels.light),
      dark: processColorToNumber(channels.dark),
      highContrastLight: normalizeChannel(channels.highContrastLight),
      highContrastDark: normalizeChannel(channels.highContrastDark),
    },
  };
}

export function processColor(value: DynamicColorValue): ProcessedDynamicColor;
export function processColor(value: unknown): number;
export function processColor(value: unknown): ProcessedColor {
  if (isDynamicColorObject(value)) {
    return processDynamicColor(value);
  }

  return processColorToNumber(value);
}

export function processColorsInProps(props: StyleProps) {
  for (const key in props) {
    if (!ColorProperties.includes(key)) continue;

    const value = props[key];

    if (Array.isArray(value)) {
      props[key] = value.map((c) => processColor(c));
    } else if (isPlatformColorObject(value)) {
      props[key] = value;
    } else {
      props[key] = processColor(value);
    }
  }
}
