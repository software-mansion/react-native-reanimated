'use strict';
'worklet';
import type {
  DynamicColorIOS as RNDynamicColorIOS,
  OpaqueColorValue,
} from 'react-native';

import { ColorProperties, processColorInitially } from '../../../Colors';
import type { StyleProps } from '../../../commonTypes';
import { IS_ANDROID, IS_IOS } from '../../constants';
import { ReanimatedError } from '../../errors';
import { isRecord } from '../../utils';

/**
 * Copied from:
 * https://github.com/facebook/react-native/blob/v0.81.0/packages/react-native/Libraries/StyleSheet/PlatformColorValueTypes.d.ts
 */
export function PlatformColor(...names: string[]): OpaqueColorValue {
  return (IS_IOS
    ? { semantic: names }
    : // eslint-disable-next-line camelcase
      { resource_paths: names }) as unknown as OpaqueColorValue;
}

type PlatformColorObject =
  | { semantic: Array<string>; resource_paths?: never }
  | { semantic?: never; resource_paths?: Array<string> };

function isPlatformColorObject(value: unknown): value is PlatformColorObject {
  return (
    isRecord(value) &&
    (Array.isArray(value.semantic) || Array.isArray(value.resource_paths))
  );
}

/* copied from:
 * https://github.com/facebook/react-native/blob/v0.81.0/packages/react-native/Libraries/StyleSheet/PlatformColorValueTypesIOS.d.ts
 */
type DynamicColorIOSTuple = Parameters<typeof RNDynamicColorIOS>[0];

export function DynamicColorIOS(tuple: DynamicColorIOSTuple): OpaqueColorValue {
  return {
    dynamic: {
      light: tuple.light,
      dark: tuple.dark,
      highContrastLight: tuple.highContrastLight,
      highContrastDark: tuple.highContrastDark,
    },
  } as unknown as OpaqueColorValue;
}

type DynamicColorObjectIOS = {
  dynamic: DynamicColorIOSTuple;
};

function isDynamicColorObjectIOS(
  value: unknown
): value is DynamicColorObjectIOS {
  return (
    isRecord(value) &&
    isRecord(value.dynamic) &&
    'light' in value.dynamic &&
    'dark' in value.dynamic
  );
}

export const ERROR_MESSAGES = {
  invalidColor: (color: unknown) =>
    `Invalid color value: ${JSON.stringify(color)}`,
  dynamicNotAvailableOnPlatform: () =>
    'DynamicColorIOS is not available on this platform.',
};

export function processColorNumber(value: unknown): number | null {
  let normalizedColor = processColorInitially(value);

  if (IS_ANDROID && typeof normalizedColor == 'number') {
    // Android use 32 bit *signed* integer to represent the color
    // We utilize the fact that bitwise operations in JS also operates on
    // signed 32 bit integers, so that we can use those to convert from
    // *unsigned* to *signed* 32bit int that way.
    normalizedColor = normalizedColor | 0x0;
  }

  if (normalizedColor !== null) {
    // The normalizedColor can be a boolean false value for the transparent color, but
    // we can safely cast it to number. Since boolean false is essentially 0, it can be
    // used in all numeric operations without issues. We use a boolean false value to
    // distinguish the transparent color from other colors.
    return normalizedColor as number;
  }

  return null;
}

export type ProcessedDynamicColorObjectIOS = {
  dynamic: {
    light: number;
    dark: number;
    highContrastLight?: number;
    highContrastDark?: number;
  };
};

const DynamicColorIOSProperties = [
  'light',
  'dark',
  'highContrastLight',
  'highContrastDark',
] as const;

function processDynamicColorObjectIOS(
  value: DynamicColorObjectIOS
): ProcessedDynamicColorObjectIOS | null {
  const result = {} as ProcessedDynamicColorObjectIOS['dynamic'];

  for (const property of DynamicColorIOSProperties) {
    if (value.dynamic[property] === undefined) {
      continue;
    }

    const processed = processColorNumber(value.dynamic[property]);
    if (processed === null) {
      return null;
    }

    result[property] = processed;
  }

  return {
    dynamic: result,
  };
}

type ProcessedColor =
  | number
  | PlatformColorObject
  | ProcessedDynamicColorObjectIOS;

/**
 * Processes a color value and returns a normalized color representation.
 *
 * @param value - The color value to process (string, number, or ColorValue)
 * @returns The processed color value - `number` for valid colors, `false` for
 *   transparent colors
 */
export function processColor(value: string | number): number;
export function processColor(value: unknown): ProcessedColor;
export function processColor(value: unknown): ProcessedColor {
  let result: ProcessedColor | null = processColorNumber(value); // try to convert to a number first (most common case)

  if (result !== null) {
    return result;
  }

  if (isPlatformColorObject(value)) {
    return value;
  }
  if (isDynamicColorObjectIOS(value)) {
    if (!IS_IOS) {
      throw new ReanimatedError(ERROR_MESSAGES.dynamicNotAvailableOnPlatform());
    }
    result = processDynamicColorObjectIOS(value);
  }

  if (result === null) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidColor(value));
  }

  return result;
}

export function processColorsInProps(props: StyleProps) {
  for (const key in props) {
    if (!ColorProperties.includes(key)) continue;
    const value = props[key];
    props[key] = Array.isArray(value)
      ? value.map((c) => processColor(c))
      : processColor(value);
  }
}
