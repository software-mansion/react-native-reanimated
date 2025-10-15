'use strict';
'worklet';
import {
  blue,
  green,
  hsvToColor,
  opacity,
  red,
  rgbaColor,
  RGBtoHSV,
} from './Colors';
import { processColor, ReanimatedError } from './common';
import type { SharedValue } from './commonTypes';
import { makeMutable } from './core';
import culori from './culori';
import { useSharedValue } from './hook/useSharedValue';
import type {
  ExtrapolationType,
  NarrowedInterpolationRange,
} from './interpolation';
import {
  Extrapolation,
  internalInterpolate,
  interpolate,
  narrowInterpolationRange,
  validateExtrapolationType,
} from './interpolation';

/** @deprecated Please use Extrapolation instead */
export const Extrapolate = Extrapolation;

/**
 * Represents a color channel value that can be a number or undefined.
 *
 * Can be undefined if the color is transparent, indicating that the channel
 * value is not applicable for transparent colors.
 */
type ColorChannel = number | undefined;

function isNumericInterpolationRange(
  narrowedRange: NarrowedInterpolationRange<ColorChannel>
): narrowedRange is NarrowedInterpolationRange<number> {
  return (
    narrowedRange.leftEdgeOutput !== undefined &&
    narrowedRange.rightEdgeOutput !== undefined
  );
}

function interpolateColorChannel(
  value: number,
  inputRange: ReadonlyArray<number>,
  colorChannel: ReadonlyArray<ColorChannel>,
  type?: ExtrapolationType
): number {
  const extrapolationConfig = validateExtrapolationType(type);
  const narrowedRange = narrowInterpolationRange(
    value,
    inputRange,
    colorChannel
  );

  if (isNumericInterpolationRange(narrowedRange)) {
    return internalInterpolate(value, narrowedRange, extrapolationConfig);
  }

  // This can happen while interpolating between a 'transparent' and a non-transparent color.
  // We want to keep color channels unchanged but interpolate only the alpha channel.
  return narrowedRange.leftEdgeOutput ?? narrowedRange.rightEdgeOutput ?? 0;
}

/**
 * Options for color interpolation.
 *
 * @param gamma - Gamma value used in gamma correction. Defaults to `2.2`.
 * @param useCorrectedHSVInterpolation - Whether to reduce the number of colors
 *   the interpolation has to go through. Defaults to `true`.
 */
export type InterpolationOptions = {
  gamma?: number;
  useCorrectedHSVInterpolation?: boolean;
};

const interpolateColorsHSV = (
  value: number,
  inputRange: readonly number[],
  colors: InterpolateHSV,
  options: InterpolationOptions
) => {
  let h = 0;
  const { useCorrectedHSVInterpolation = true } = options;
  if (useCorrectedHSVInterpolation) {
    // if the difference between hues in a range is > 180 deg
    // then move the hue at the right end of the range +/- 360 deg
    // and add the next point in the original place + 0.00001 with original hue
    // not to break the next range
    const correctedInputRange = [inputRange[0]];
    const originalH = colors.h;
    const correctedH = [originalH[0]];

    for (let i = 1; i < originalH.length; ++i) {
      const currentH = originalH[i];
      const prevH = originalH[i - 1];

      // Handle undefined values (when the 'transparent' color is used)
      if (currentH === undefined || prevH === undefined) {
        correctedInputRange.push(inputRange[i]);
        correctedH.push(currentH);
        continue;
      }

      const d = currentH - prevH;
      if (currentH > prevH && d > 0.5) {
        correctedInputRange.push(inputRange[i]);
        correctedInputRange.push(inputRange[i] + 0.00001);
        correctedH.push(currentH - 1);
        correctedH.push(currentH);
      } else if (currentH < prevH && d < -0.5) {
        correctedInputRange.push(inputRange[i]);
        correctedInputRange.push(inputRange[i] + 0.00001);
        correctedH.push(currentH + 1);
        correctedH.push(currentH);
      } else {
        correctedInputRange.push(inputRange[i]);
        correctedH.push(currentH);
      }
    }
    h =
      (interpolateColorChannel(
        value,
        correctedInputRange,
        correctedH,
        Extrapolation.CLAMP
      ) +
        1) %
      1;
  } else {
    h = interpolateColorChannel(
      value,
      inputRange,
      colors.h,
      Extrapolation.CLAMP
    );
  }
  const s = interpolateColorChannel(
    value,
    inputRange,
    colors.s,
    Extrapolation.CLAMP
  );
  const v = interpolateColorChannel(
    value,
    inputRange,
    colors.v,
    Extrapolation.CLAMP
  );
  const a = interpolate(value, inputRange, colors.a, Extrapolation.CLAMP);
  return hsvToColor(h, s, v, a);
};

const toLinearSpace = (x: ColorChannel[], gamma: number): ColorChannel[] =>
  x.map((v) => v && Math.pow(v / 255, gamma));

const toGammaSpace = (x: number, gamma: number): number =>
  Math.round(Math.pow(x, 1 / gamma) * 255);

const interpolateColorsRGB = (
  value: number,
  inputRange: readonly number[],
  colors: InterpolateRGB,
  options: InterpolationOptions
) => {
  const { gamma = 2.2 } = options;
  let { r: outputR, g: outputG, b: outputB } = colors;

  if (gamma !== 1) {
    outputR = toLinearSpace(outputR, gamma);
    outputG = toLinearSpace(outputG, gamma);
    outputB = toLinearSpace(outputB, gamma);
  }

  const r = interpolateColorChannel(
    value,
    inputRange,
    outputR,
    Extrapolation.CLAMP
  );
  const g = interpolateColorChannel(
    value,
    inputRange,
    outputG,
    Extrapolation.CLAMP
  );
  const b = interpolateColorChannel(
    value,
    inputRange,
    outputB,
    Extrapolation.CLAMP
  );
  const a = interpolate(value, inputRange, colors.a, Extrapolation.CLAMP);

  if (gamma === 1) {
    return rgbaColor(r, g, b, a);
  }

  return rgbaColor(
    toGammaSpace(r, gamma),
    toGammaSpace(g, gamma),
    toGammaSpace(b, gamma),
    a
  );
};

const interpolateColorsLAB = (
  value: number,
  inputRange: readonly number[],
  colors: InterpolateLAB,
  _options: InterpolationOptions
) => {
  const l = interpolateColorChannel(
    value,
    inputRange,
    colors.l,
    Extrapolation.CLAMP
  );
  const a = interpolateColorChannel(
    value,
    inputRange,
    colors.a,
    Extrapolation.CLAMP
  );
  const b = interpolateColorChannel(
    value,
    inputRange,
    colors.b,
    Extrapolation.CLAMP
  );
  const alpha = interpolate(
    value,
    inputRange,
    colors.alpha,
    Extrapolation.CLAMP
  );

  const {
    r: _r,
    g: _g,
    b: _b,
    alpha: _alpha,
  } = culori.oklab.convert.toRgb({ l, a, b, alpha });

  return rgbaColor(_r, _g, _b, _alpha);
};

const _splitColorsIntoChannels = (
  colors: readonly (string | number)[],
  convFromRgb: (color: { r: number; g: number; b: number }) => {
    ch1: number;
    ch2: number;
    ch3: number;
  }
): {
  ch1: ColorChannel[];
  ch2: ColorChannel[];
  ch3: ColorChannel[];
  alpha: number[];
} => {
  const ch1: ColorChannel[] = [];
  const ch2: ColorChannel[] = [];
  const ch3: ColorChannel[] = [];
  const alpha: number[] = [];

  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    const processedColor = processColor(color);

    if (typeof processedColor === 'number') {
      const convertedColor = convFromRgb({
        r: red(processedColor),
        g: green(processedColor),
        b: blue(processedColor),
      });

      ch1.push(convertedColor.ch1);
      ch2.push(convertedColor.ch2);
      ch3.push(convertedColor.ch3);
      alpha.push(opacity(processedColor));
    } else if (color === 'transparent') {
      ch1.push(undefined);
      ch2.push(undefined);
      ch3.push(undefined);
      alpha.push(0);
    }
  }

  return {
    ch1,
    ch2,
    ch3,
    alpha,
  };
};

export interface InterpolateRGB {
  r: ColorChannel[];
  g: ColorChannel[];
  b: ColorChannel[];
  a: number[];
}

const getInterpolateRGB = (
  colors: readonly (string | number)[]
): InterpolateRGB => {
  const { ch1, ch2, ch3, alpha } = _splitColorsIntoChannels(
    colors,
    (color) => ({
      ch1: color.r,
      ch2: color.g,
      ch3: color.b,
    })
  );

  return {
    r: ch1,
    g: ch2,
    b: ch3,
    a: alpha,
  };
};

export interface InterpolateHSV {
  h: ColorChannel[];
  s: ColorChannel[];
  v: ColorChannel[];
  a: number[];
}

const getInterpolateHSV = (
  colors: readonly (string | number)[]
): InterpolateHSV => {
  const { ch1, ch2, ch3, alpha } = _splitColorsIntoChannels(colors, (color) => {
    const hsvColor = RGBtoHSV(color.r, color.g, color.b);
    return {
      ch1: hsvColor.h,
      ch2: hsvColor.s,
      ch3: hsvColor.v,
    };
  });

  return {
    h: ch1,
    s: ch2,
    v: ch3,
    a: alpha,
  };
};

interface InterpolateLAB {
  l: ColorChannel[];
  a: ColorChannel[];
  b: ColorChannel[];
  alpha: number[];
}

const getInterpolateLAB = (
  colors: readonly (string | number)[]
): InterpolateLAB => {
  const { ch1, ch2, ch3, alpha } = _splitColorsIntoChannels(colors, (color) => {
    const labColor = culori.oklab.convert.fromRgb(color);
    return {
      ch1: labColor.l,
      ch2: labColor.a,
      ch3: labColor.b,
    };
  });

  return {
    l: ch1,
    a: ch2,
    b: ch3,
    alpha,
  };
};

/**
 * Lets you map a value from a range of numbers to a range of colors using
 * linear interpolation.
 *
 * @param value - A number from the `input` range that is going to be mapped to
 *   the color in the `output` range.
 * @param inputRange - An array of numbers specifying the input range of the
 *   interpolation.
 * @param outputRange - An array of output colors values (eg. "red", "#00FFCC",
 *   "rgba(255, 0, 0, 0.5)").
 * @param colorSpace - The color space to use for interpolation. Defaults to
 *   'RGB'.
 * @param options - Additional options for interpolation -
 *   {@link InterpolationOptions}.
 * @returns The color after interpolation from within the output range in
 *   rgba(r, g, b, a) format.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/utilities/interpolateColor
 */
export function interpolateColor(
  value: number,
  inputRange: readonly number[],
  outputRange: readonly string[],
  colorSpace?: 'RGB' | 'HSV' | 'LAB',
  options?: InterpolationOptions
): string;

export function interpolateColor(
  value: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  colorSpace?: 'RGB' | 'HSV' | 'LAB',
  options?: InterpolationOptions
): number;

export function interpolateColor(
  value: number,
  inputRange: readonly number[],
  outputRange: readonly (string | number)[],
  colorSpace: 'RGB' | 'HSV' | 'LAB' = 'RGB',
  options: InterpolationOptions = {}
): string | number {
  if (colorSpace === 'HSV') {
    return interpolateColorsHSV(
      value,
      inputRange,
      getInterpolateHSV(outputRange),
      options
    );
  } else if (colorSpace === 'RGB') {
    return interpolateColorsRGB(
      value,
      inputRange,
      getInterpolateRGB(outputRange),
      options
    );
  } else if (colorSpace === 'LAB') {
    return interpolateColorsLAB(
      value,
      inputRange,
      getInterpolateLAB(outputRange),
      options
    );
  }

  throw new ReanimatedError(
    `Invalid color space provided: ${
      colorSpace as string
    }. Supported values are: ['RGB', 'HSV', 'LAB'].`
  );
}

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
