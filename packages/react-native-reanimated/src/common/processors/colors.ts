'use strict';
'worklet';
import type {
  ColorValue,
  DynamicColorIOS as RNDynamicColorIOS,
} from 'react-native';

import {
  ColorProperties,
  DynamicColorIOSProperties,
  processColorInitially,
} from '../../Colors';
import type { StyleProps } from '../../commonTypes';
import { IS_ANDROID, IS_IOS } from '../constants';
import { ReanimatedError } from '../errors';
import type { Maybe } from '../types';

type DynamicColorIOSTuple = Parameters<typeof RNDynamicColorIOS>[0];

type DynamicColorValue = ColorValue & {
  dynamic: {
    light: ColorValue;
    dark: ColorValue;
    highContrastLight?: ColorValue;
    highContrastDark?: ColorValue;
  };
};

type PlatformColorValue = ColorValue & { semantic?: Array<string> } & {
  resource_paths?: Array<string>;
};

export function PlatformColor(...names: Array<string>): PlatformColorValue {
  'worklet';
  // eslint-disable-next-line camelcase
  const mapped = IS_IOS ? { semantic: names } : { resource_paths: names };
  return mapped as PlatformColorValue;
}

export function DynamicColorIOS(
  tuple: DynamicColorIOSTuple
): DynamicColorValue {
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

function isDynamicColorObject(value: any): boolean {
  return (
    value &&
    typeof value === 'object' &&
    'dynamic' in value &&
    DynamicColorIOSProperties.some((key) => key in value.dynamic)
  );
}

export const ERROR_MESSAGES = {
  invalidColor: (color: unknown) => `Invalid color value: ${String(color)}`,
};

/**
 * Processes a color value and returns a normalized color representation.
 *
 * @param value - The color value to process (string, number, or ColorValue)
 * @returns The processed color value as a number for valid colors, null for
 *   transparent colors, or undefined for invalid colors
 */
export function processColor(value: unknown): number | null {
  let normalizedColor = processColorInitially(value);

  if (IS_ANDROID && typeof normalizedColor == 'number') {
    // Android use 32 bit *signed* integer to represent the color
    // We utilize the fact that bitwise operations in JS also operates on
    // signed 32 bit integers, so that we can use those to convert from
    // *unsigned* to *signed* 32bit int that way.
    normalizedColor = normalizedColor | 0x0;
  }

  if (normalizedColor === undefined) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidColor(value));
  }

  return normalizedColor;
}

export function processColorsInProps(props: StyleProps) {
  for (const key in props) {
    if (!ColorProperties.includes(key)) continue;

    const value = props[key];

    if (Array.isArray(value)) {
      props[key] = value.map((c) => processColor(c));
    } else if (isDynamicColorObject(value)) {
      if (!IS_IOS) {
        throw new ReanimatedError(
          'DynamicColorIOS is not available on this platform.'
        );
      }
      const processed = { dynamic: {} as Record<string, Maybe<number>> };
      const dynamicFields = value.dynamic;
      for (const field in dynamicFields) {
        processed.dynamic[field] = processColor(dynamicFields[field]);
      }
      props[key] = processed;
    } else {
      props[key] = processColor(value);
    }
  }
}
