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
import { Extrapolation, interpolate } from './interpolation';

/** @deprecated Please use Extrapolation instead */
export const Extrapolate = Extrapolation;

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
    // to not break the next range
    const correctedInputRange = [inputRange[0]];
    const originalH = colors.h;
    const correctedH = [originalH[0]];

    for (let i = 1; i < originalH.length; ++i) {
      const d = originalH[i] - originalH[i - 1];
      if (originalH[i] > originalH[i - 1] && d > 0.5) {
        correctedInputRange.push(inputRange[i]);
        correctedInputRange.push(inputRange[i] + 0.00001);
        correctedH.push(originalH[i] - 1);
        correctedH.push(originalH[i]);
      } else if (originalH[i] < originalH[i - 1] && d < -0.5) {
        correctedInputRange.push(inputRange[i]);
        correctedInputRange.push(inputRange[i] + 0.00001);
        correctedH.push(originalH[i] + 1);
        correctedH.push(originalH[i]);
      } else {
        correctedInputRange.push(inputRange[i]);
        correctedH.push(originalH[i]);
      }
    }
    h =
      (interpolate(
        value,
        correctedInputRange,
        correctedH,
        Extrapolation.CLAMP
      ) +
        1) %
      1;
  } else {
    h = interpolate(value, inputRange, colors.h, Extrapolation.CLAMP);
  }
  const s = interpolate(value, inputRange, colors.s, Extrapolation.CLAMP);
  const v = interpolate(value, inputRange, colors.v, Extrapolation.CLAMP);
  const a = interpolate(value, inputRange, colors.a, Extrapolation.CLAMP);
  return hsvToColor(h, s, v, a);
};

const toLinearSpace = (x: number[], gamma: number): number[] => {
  return x.map((v) => Math.pow(v / 255, gamma));
};

const toGammaSpace = (x: number, gamma: number): number => {
  return Math.round(Math.pow(x, 1 / gamma) * 255);
};

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
  const r = interpolate(value, inputRange, outputR, Extrapolation.CLAMP);
  const g = interpolate(value, inputRange, outputG, Extrapolation.CLAMP);
  const b = interpolate(value, inputRange, outputB, Extrapolation.CLAMP);
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
  const l = interpolate(value, inputRange, colors.l, Extrapolation.CLAMP);
  const a = interpolate(value, inputRange, colors.a, Extrapolation.CLAMP);
  const b = interpolate(value, inputRange, colors.b, Extrapolation.CLAMP);
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
  processedColors: readonly number[],
  convFromRgb: (color: { r: number; g: number; b: number }) => {
    ch1: number;
    ch2: number;
    ch3: number;
  }
): {
  ch1: number[];
  ch2: number[];
  ch3: number[];
  alpha: number[];
} => {
  const ch1: number[] = [];
  const ch2: number[] = [];
  const ch3: number[] = [];
  const alpha: number[] = [];

  for (const processedColor of processedColors) {
    const convertedColor = convFromRgb({
      r: red(processedColor),
      g: green(processedColor),
      b: blue(processedColor),
    });

    ch1.push(convertedColor.ch1);
    ch2.push(convertedColor.ch2);
    ch3.push(convertedColor.ch3);
    alpha.push(opacity(processedColor));
  }

  return {
    ch1,
    ch2,
    ch3,
    alpha,
  };
};

export interface InterpolateRGB {
  r: number[];
  g: number[];
  b: number[];
  a: number[];
}

const getInterpolateRGB = (
  processedColors: readonly number[]
): InterpolateRGB => {
  const { ch1, ch2, ch3, alpha } = _splitColorsIntoChannels(
    processedColors,
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
  h: number[];
  s: number[];
  v: number[];
  a: number[];
}

const getInterpolateHSV = (
  processedColors: readonly number[]
): InterpolateHSV => {
  const { ch1, ch2, ch3, alpha } = _splitColorsIntoChannels(
    processedColors,
    (color) => {
      const hsvColor = RGBtoHSV(color.r, color.g, color.b);
      return {
        ch1: hsvColor.h,
        ch2: hsvColor.s,
        ch3: hsvColor.v,
      };
    }
  );

  return {
    h: ch1,
    s: ch2,
    v: ch3,
    a: alpha,
  };
};

interface InterpolateLAB {
  l: number[];
  a: number[];
  b: number[];
  alpha: number[];
}

const getInterpolateLAB = (
  processedColors: readonly number[]
): InterpolateLAB => {
  const { ch1, ch2, ch3, alpha } = _splitColorsIntoChannels(
    processedColors,
    (color) => {
      const labColor = culori.oklab.convert.fromRgb(color);
      return {
        ch1: labColor.l,
        ch2: labColor.a,
        ch3: labColor.b,
      };
    }
  );

  return {
    l: ch1,
    a: ch2,
    b: ch3,
    alpha,
  };
};

const TRANSPARENCY_MASK = 0x00ffffff; // AARRGGBB

/**
 * Processes color ranges to handle transparent color interpolation by replacing
 * 'transparent' values with RGBA values that preserve the RGB channels from
 * neighboring colors while setting alpha to 0.
 *
 * @example
 *   // Transparent between colors gets RGB from both neighbors
 *   ['red', 'transparent', 'blue'] → ['rgba(255, 0, 0, 1)', 'rgba(255, 0, 0, 0)', 'rgba(0, 0, 255, 0)', 'rgba(0, 0, 255, 1)']
 *
 *   // Consecutive transparent values are consolidated if possible
 *   ['transparent', 'transparent', 'red'] → ['rgba(255, 0, 0, 0)', 'rgba(255, 0, 0, 1)']
 */
function processColorRanges(
  inputRange: readonly number[],
  outputRange: readonly (number | string)[]
): [readonly number[], readonly number[]] {
  const processedInputRange: number[] = [];
  const processedOutputRange: number[] = [];
  let isPrevTransparent = false;

  for (let i = 0; i < inputRange.length; i++) {
    const color = outputRange[i];
    const processedColor = processColor(color);

    const isTransparent = color === 'transparent';

    if (typeof processedColor === 'number') {
      if (isPrevTransparent) {
        // Ensure that we animate from the correct RGB values (the same as in the
        // current color) with alpha 0 when animating from transparent to a color.
        processedInputRange.push(inputRange[i - 1]);
        processedOutputRange.push(processedColor & TRANSPARENCY_MASK);
      }
      // Add current color to the output range
      processedInputRange.push(inputRange[i]);
      processedOutputRange.push(processedColor);
    } else if (!isPrevTransparent) {
      // If the transparent color is encountered after the non-transparent color,
      // then we add the last processed color with alpha 0 to the output range.
      if (isTransparent && i > 0) {
        const lastProcessedColor =
          processedOutputRange[processedOutputRange.length - 1];
        processedInputRange.push(inputRange[i]);
        processedOutputRange.push(lastProcessedColor & TRANSPARENCY_MASK);
      }
    } else if (i === inputRange.length - 1 && !processedOutputRange.length) {
      // If the end of the input range is reached, the previous color was transparent
      // and the output range is empty, that means all colors were transparent,
      // so we can add just 2 transparent colors to the output range.
      const lastindex = inputRange.length - 1;
      processedInputRange.push(inputRange[0], inputRange[lastindex]);
      processedOutputRange.push(0, 0);
    }

    isPrevTransparent = isTransparent;
  }

  return [processedInputRange, processedOutputRange];
}

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
  const [processedInputRange, processedOutputRange] = processColorRanges(
    inputRange,
    outputRange
  );

  if (colorSpace === 'HSV') {
    return interpolateColorsHSV(
      value,
      processedInputRange,
      getInterpolateHSV(processedOutputRange),
      options
    );
  } else if (colorSpace === 'RGB') {
    return interpolateColorsRGB(
      value,
      processedInputRange,
      getInterpolateRGB(processedOutputRange),
      options
    );
  } else if (colorSpace === 'LAB') {
    return interpolateColorsLAB(
      value,
      processedInputRange,
      getInterpolateLAB(processedOutputRange),
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
