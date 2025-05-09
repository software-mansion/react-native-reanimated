import type { SharedValue } from './commonTypes';
import { Extrapolation } from './interpolation';
/** @deprecated Please use Extrapolation instead */
export declare const Extrapolate: typeof Extrapolation;
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
export interface InterpolateLAB {
    l: number[];
    a: number[];
    b: number[];
    alpha: number[];
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
export declare function interpolateColor(value: number, inputRange: readonly number[], outputRange: readonly string[], colorSpace?: 'RGB' | 'HSV' | 'LAB', options?: InterpolationOptions): string;
export declare function interpolateColor(value: number, inputRange: readonly number[], outputRange: readonly number[], colorSpace?: 'RGB' | 'HSV' | 'LAB', options?: InterpolationOptions): number;
export declare enum ColorSpace {
    RGB = 0,
    HSV = 1,
    LAB = 2
}
export interface InterpolateConfig {
    inputRange: readonly number[];
    outputRange: readonly (string | number)[];
    colorSpace: ColorSpace;
    cache: SharedValue<InterpolateRGB | InterpolateHSV | null>;
    options: InterpolationOptions;
}
export declare function useInterpolateConfig(inputRange: readonly number[], outputRange: readonly (string | number)[], colorSpace?: ColorSpace, options?: InterpolationOptions): SharedValue<InterpolateConfig>;
//# sourceMappingURL=interpolateColor.d.ts.map