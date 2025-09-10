'use strict';

import { blue, green, hsvToColor, opacity, red, rgbaColor, RGBtoHSV } from "./Colors.js";
import { processColor, ReanimatedError } from "./common/index.js";
import { makeMutable } from "./core.js";
import culori from "./culori/index.js";
import { useSharedValue } from "./hook/useSharedValue.js";
import { Extrapolation, interpolate } from "./interpolation.js";

/** @deprecated Please use Extrapolation instead */
export const Extrapolate = Extrapolation;

/**
 * Options for color interpolation.
 *
 * @param gamma - Gamma value used in gamma correction. Defaults to `2.2`.
 * @param useCorrectedHSVInterpolation - Whether to reduce the number of colors
 *   the interpolation has to go through. Defaults to `true`.
 */

const interpolateColorsHSV = (value, inputRange, colors, options) => {
  'worklet';

  let h = 0;
  const {
    useCorrectedHSVInterpolation = true
  } = options;
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
    h = (interpolate(value, correctedInputRange, correctedH, Extrapolation.CLAMP) + 1) % 1;
  } else {
    h = interpolate(value, inputRange, colors.h, Extrapolation.CLAMP);
  }
  const s = interpolate(value, inputRange, colors.s, Extrapolation.CLAMP);
  const v = interpolate(value, inputRange, colors.v, Extrapolation.CLAMP);
  const a = interpolate(value, inputRange, colors.a, Extrapolation.CLAMP);
  return hsvToColor(h, s, v, a);
};
const toLinearSpace = (x, gamma) => {
  'worklet';

  return x.map(v => Math.pow(v / 255, gamma));
};
const toGammaSpace = (x, gamma) => {
  'worklet';

  return Math.round(Math.pow(x, 1 / gamma) * 255);
};
const interpolateColorsRGB = (value, inputRange, colors, options) => {
  'worklet';

  const {
    gamma = 2.2
  } = options;
  let {
    r: outputR,
    g: outputG,
    b: outputB
  } = colors;
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
  return rgbaColor(toGammaSpace(r, gamma), toGammaSpace(g, gamma), toGammaSpace(b, gamma), a);
};
const interpolateColorsLAB = (value, inputRange, colors, _options) => {
  'worklet';

  const l = interpolate(value, inputRange, colors.l, Extrapolation.CLAMP);
  const a = interpolate(value, inputRange, colors.a, Extrapolation.CLAMP);
  const b = interpolate(value, inputRange, colors.b, Extrapolation.CLAMP);
  const alpha = interpolate(value, inputRange, colors.alpha, Extrapolation.CLAMP);
  const {
    r: _r,
    g: _g,
    b: _b,
    alpha: _alpha
  } = culori.oklab.convert.toRgb({
    l,
    a,
    b,
    alpha
  });
  return rgbaColor(_r, _g, _b, _alpha);
};
const _splitColorsIntoChannels = (colors, convFromRgb) => {
  'worklet';

  const ch1 = [];
  const ch2 = [];
  const ch3 = [];
  const alpha = [];
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    const processedColor = processColor(color);
    if (typeof processedColor === 'number') {
      const convertedColor = convFromRgb({
        r: red(processedColor),
        g: green(processedColor),
        b: blue(processedColor)
      });
      ch1.push(convertedColor.ch1);
      ch2.push(convertedColor.ch2);
      ch3.push(convertedColor.ch3);
      alpha.push(opacity(processedColor));
    }
  }
  return {
    ch1,
    ch2,
    ch3,
    alpha
  };
};
const getInterpolateRGB = colors => {
  'worklet';

  const {
    ch1,
    ch2,
    ch3,
    alpha
  } = _splitColorsIntoChannels(colors, color => ({
    ch1: color.r,
    ch2: color.g,
    ch3: color.b
  }));
  return {
    r: ch1,
    g: ch2,
    b: ch3,
    a: alpha
  };
};
const getInterpolateHSV = colors => {
  'worklet';

  const {
    ch1,
    ch2,
    ch3,
    alpha
  } = _splitColorsIntoChannels(colors, color => {
    const hsvColor = RGBtoHSV(color.r, color.g, color.b);
    return {
      ch1: hsvColor.h,
      ch2: hsvColor.s,
      ch3: hsvColor.v
    };
  });
  return {
    h: ch1,
    s: ch2,
    v: ch3,
    a: alpha
  };
};
const getInterpolateLAB = colors => {
  'worklet';

  const {
    ch1,
    ch2,
    ch3,
    alpha
  } = _splitColorsIntoChannels(colors, color => {
    const labColor = culori.oklab.convert.fromRgb(color);
    return {
      ch1: labColor.l,
      ch2: labColor.a,
      ch3: labColor.b
    };
  });
  return {
    l: ch1,
    a: ch2,
    b: ch3,
    alpha
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

export function interpolateColor(value, inputRange, outputRange, colorSpace = 'RGB', options = {}) {
  'worklet';

  if (colorSpace === 'HSV') {
    return interpolateColorsHSV(value, inputRange, getInterpolateHSV(outputRange), options);
  } else if (colorSpace === 'RGB') {
    return interpolateColorsRGB(value, inputRange, getInterpolateRGB(outputRange), options);
  } else if (colorSpace === 'LAB') {
    return interpolateColorsLAB(value, inputRange, getInterpolateLAB(outputRange), options);
  }
  throw new ReanimatedError(`Invalid color space provided: ${colorSpace}. Supported values are: ['RGB', 'HSV', 'LAB'].`);
}
export let ColorSpace = /*#__PURE__*/function (ColorSpace) {
  ColorSpace[ColorSpace["RGB"] = 0] = "RGB";
  ColorSpace[ColorSpace["HSV"] = 1] = "HSV";
  ColorSpace[ColorSpace["LAB"] = 2] = "LAB";
  return ColorSpace;
}({});
export function useInterpolateConfig(inputRange, outputRange, colorSpace = ColorSpace.RGB, options = {}) {
  return useSharedValue({
    inputRange,
    outputRange,
    colorSpace,
    cache: makeMutable(null),
    options
  });
}
//# sourceMappingURL=interpolateColor.js.map