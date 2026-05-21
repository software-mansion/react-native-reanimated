'use strict';
import { hsvToColor, opacity, rgbaColor, RGBtoHSV } from './Colors';
import { processColor } from './common';
import culori from './culori';
import { Extrapolation } from './interpolation';

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

// Public types — re-exported from the package barrel for backward compat.
export interface InterpolateRGB {
  r: number[];
  g: number[];
  b: number[];
  a: number[];
}

export interface InterpolateHSV {
  h: number[];
  s: number[];
  v: number[];
  a: number[];
}

const TRANSPARENCY_MASK = 0x00ffffff; // AARRGGBB → mask alpha byte off

// Returns i such that the active bracket is (i, i+1). Mirrors
// `interpolate()`'s right-of-range behavior so values past the last stop
// map to the final segment.
function findBracket(value: number, inputRange: readonly number[]): number {
  'worklet';
  const length = inputRange.length;
  if (value > inputRange[length - 1]) return length - 2;
  let left = 1;
  let right = length - 1;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (value <= inputRange[mid]) right = mid;
    else left = mid + 1;
  }
  return left - 1;
}

function clamp01(t: number): number {
  'worklet';
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

function lerp(a: number, b: number, t: number): number {
  'worklet';
  // Snap to endpoints so out-of-range CLAMP results are bit-identical to the
  // pre-existing implementation's behavior (which returned the edge value
  // directly from `interpolate`'s CLAMP branch).
  if (t === 0) return a;
  if (t === 1) return b;
  return a + t * (b - a);
}

function findNonTransparentLeft(
  outputRange: readonly (number | string)[],
  startInclusive: number
): number {
  'worklet';
  for (let j = startInclusive; j >= 0; j--) {
    if (outputRange[j] !== 'transparent') return j;
  }
  return -1;
}

function findNonTransparentRight(
  outputRange: readonly (number | string)[],
  startInclusive: number
): number {
  'worklet';
  const n = outputRange.length;
  for (let j = startInclusive; j < n; j++) {
    if (outputRange[j] !== 'transparent') return j;
  }
  return -1;
}

// Resolves the two RGBA endpoints for the active bracket (i, i+1).
// Replicates the original processColorRanges transparency rules locally:
//   (not-T, not-T): both endpoints carry their parsed RGB and alpha.
//   (not-T, T)    : right endpoint = left RGB with alpha 0.
//   (T, not-T)    : left  endpoint = right RGB with alpha 0.
//   (T, T)        : use the nearest non-T neighbor on each side (alpha 0
//                   throughout); fully-transparent runs collapse to 0.
// Only the bracket plus an optional outward scan in the (T,T) case is read,
// so this is O(1) for typical palettes (a single transparent stop never
// neighbors another one).
type Endpoints = {
  rgbL: number; // 0x00RRGGBB
  alphaL: number; // 0..1
  rgbR: number;
  alphaR: number;
};

function resolveEndpoints(
  outputRange: readonly (number | string)[],
  i: number
): Endpoints {
  'worklet';
  const leftIsT = outputRange[i] === 'transparent';
  const rightIsT = outputRange[i + 1] === 'transparent';

  if (!leftIsT && !rightIsT) {
    const cl = processColor(outputRange[i]) as number;
    const cr = processColor(outputRange[i + 1]) as number;
    return {
      rgbL: cl & TRANSPARENCY_MASK,
      alphaL: opacity(cl),
      rgbR: cr & TRANSPARENCY_MASK,
      alphaR: opacity(cr),
    };
  }
  if (!leftIsT && rightIsT) {
    const cl = processColor(outputRange[i]) as number;
    const rgb = cl & TRANSPARENCY_MASK;
    return { rgbL: rgb, alphaL: opacity(cl), rgbR: rgb, alphaR: 0 };
  }
  if (leftIsT && !rightIsT) {
    const cr = processColor(outputRange[i + 1]) as number;
    const rgb = cr & TRANSPARENCY_MASK;
    return { rgbL: rgb, alphaL: 0, rgbR: rgb, alphaR: opacity(cr) };
  }
  const leftIdx = findNonTransparentLeft(outputRange, i - 1);
  const rightIdx = findNonTransparentRight(outputRange, i + 2);
  if (leftIdx < 0 && rightIdx < 0) {
    return { rgbL: 0, alphaL: 0, rgbR: 0, alphaR: 0 };
  }
  if (leftIdx < 0) {
    const rgb =
      (processColor(outputRange[rightIdx]) as number) & TRANSPARENCY_MASK;
    return { rgbL: rgb, alphaL: 0, rgbR: rgb, alphaR: 0 };
  }
  if (rightIdx < 0) {
    const rgb =
      (processColor(outputRange[leftIdx]) as number) & TRANSPARENCY_MASK;
    return { rgbL: rgb, alphaL: 0, rgbR: rgb, alphaR: 0 };
  }
  const cl =
    (processColor(outputRange[leftIdx]) as number) & TRANSPARENCY_MASK;
  const cr =
    (processColor(outputRange[rightIdx]) as number) & TRANSPARENCY_MASK;
  return { rgbL: cl, alphaL: 0, rgbR: cr, alphaR: 0 };
}

function interpolateRGB(
  t: number,
  e: Endpoints,
  options: InterpolationOptions
): string | number {
  'worklet';
  const { gamma = 2.2 } = options;
  const rL = (e.rgbL >> 16) & 255;
  const gL = (e.rgbL >> 8) & 255;
  const bL = e.rgbL & 255;
  const rR = (e.rgbR >> 16) & 255;
  const gR = (e.rgbR >> 8) & 255;
  const bR = e.rgbR & 255;
  const a = lerp(e.alphaL, e.alphaR, t);
  if (gamma === 1) {
    return rgbaColor(lerp(rL, rR, t), lerp(gL, gR, t), lerp(bL, bR, t), a);
  }
  const linR = lerp(Math.pow(rL / 255, gamma), Math.pow(rR / 255, gamma), t);
  const linG = lerp(Math.pow(gL / 255, gamma), Math.pow(gR / 255, gamma), t);
  const linB = lerp(Math.pow(bL / 255, gamma), Math.pow(bR / 255, gamma), t);
  return rgbaColor(
    Math.round(Math.pow(linR, 1 / gamma) * 255),
    Math.round(Math.pow(linG, 1 / gamma) * 255),
    Math.round(Math.pow(linB, 1 / gamma) * 255),
    a
  );
}

function interpolateHSV(
  t: number,
  e: Endpoints,
  options: InterpolationOptions
): string | number {
  'worklet';
  const { useCorrectedHSVInterpolation = true } = options;
  const hsvL = RGBtoHSV(
    (e.rgbL >> 16) & 255,
    (e.rgbL >> 8) & 255,
    e.rgbL & 255
  );
  const hsvR = RGBtoHSV(
    (e.rgbR >> 16) & 255,
    (e.rgbR >> 8) & 255,
    e.rgbR & 255
  );
  let hR = hsvR.h;
  if (useCorrectedHSVInterpolation) {
    const d = hR - hsvL.h;
    if (d > 0.5) hR -= 1;
    else if (d < -0.5) hR += 1;
  }
  let h = lerp(hsvL.h, hR, t);
  if (useCorrectedHSVInterpolation) h = (h + 1) % 1;
  return hsvToColor(
    h,
    lerp(hsvL.s, hsvR.s, t),
    lerp(hsvL.v, hsvR.v, t),
    lerp(e.alphaL, e.alphaR, t)
  );
}

function interpolateLAB(t: number, e: Endpoints): string | number {
  'worklet';
  const labL = culori.oklab.convert.fromRgb({
    r: (e.rgbL >> 16) & 255,
    g: (e.rgbL >> 8) & 255,
    b: e.rgbL & 255,
  });
  const labR = culori.oklab.convert.fromRgb({
    r: (e.rgbR >> 16) & 255,
    g: (e.rgbR >> 8) & 255,
    b: e.rgbR & 255,
  });
  const { r, g, b, alpha } = culori.oklab.convert.toRgb({
    l: lerp(labL.l, labR.l, t),
    a: lerp(labL.a, labR.a, t),
    b: lerp(labL.b, labR.b, t),
    alpha: lerp(e.alphaL, e.alphaR, t),
  });
  return rgbaColor(r, g, b, alpha);
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
  'worklet';
  if (inputRange.length < 2 || outputRange.length < 2) {
    throw new Error(
      '[Reanimated] Interpolation input and output ranges should contain at least two values.'
    );
  }
  // Lazy: binary-search the bracket first, parse only the two endpoint
  // colors. O(log N) per call (HEAD parsed every stop every frame, O(N)).
  // No cache; mutation-safe; pays no first-call O(N) tax.
  const i = findBracket(value, inputRange);
  const xl = inputRange[i];
  const xr = inputRange[i + 1];
  const t = xr === xl ? 0 : clamp01((value - xl) / (xr - xl));
  const e = resolveEndpoints(outputRange, i);
  if (colorSpace === 'RGB') return interpolateRGB(t, e, options);
  if (colorSpace === 'HSV') return interpolateHSV(t, e, options);
  if (colorSpace === 'LAB') return interpolateLAB(t, e);
  throw new Error(
    `[Reanimated] Invalid color space provided: ${
      colorSpace as string
    }. Supported values are: ['RGB', 'HSV', 'LAB'].`
  );
}
