'use strict';
import type { SharedValue } from '../commonTypes';
import { makeMutable } from '../core';
import {
  type InterpolateHSV,
  type InterpolateRGB,
  type InterpolationOptions,
} from '../utils/colors/interpolateColor';
import { useSharedValue } from './useSharedValue';

export enum ColorSpace {
  RGB = 0,
  HSV = 1,
  LAB = 2,
}

export interface InterpolateConfig {
  inputRange: readonly number[];
  outputRange: readonly (string | number)[];
  colorSpace: ColorSpace;
  cache: SharedValue<InterpolateRGB | InterpolateHSV | null>;
  options: InterpolationOptions;
}

export function useInterpolateConfig(
  inputRange: readonly number[],
  outputRange: readonly (string | number)[],
  colorSpace = ColorSpace.RGB,
  options: InterpolationOptions = {}
): SharedValue<InterpolateConfig> {
  return useSharedValue<InterpolateConfig>({
    inputRange,
    outputRange,
    colorSpace,
    cache: makeMutable<InterpolateRGB | InterpolateHSV | null>(null),
    options,
  });
}
