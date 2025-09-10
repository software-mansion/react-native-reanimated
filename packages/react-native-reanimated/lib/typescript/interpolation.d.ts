/**
 * Extrapolation type.
 *
 * @param IDENTITY - Returns the provided value as is.
 * @param CLAMP - Clamps the value to the edge of the output range.
 * @param EXTEND - Predicts the values beyond the output range.
 */
export declare enum Extrapolation {
    IDENTITY = "identity",
    CLAMP = "clamp",
    EXTEND = "extend"
}
/** Represents the possible values for extrapolation as a string. */
type ExtrapolationAsString = 'identity' | 'clamp' | 'extend';
/** Allows to specify extrapolation for left and right edge of the interpolation. */
export interface ExtrapolationConfig {
    extrapolateLeft?: Extrapolation | string;
    extrapolateRight?: Extrapolation | string;
}
/** Configuration options for extrapolation. */
export type ExtrapolationType = ExtrapolationConfig | Extrapolation | ExtrapolationAsString | undefined;
/**
 * Lets you map a value from one range to another using linear interpolation.
 *
 * @param value - A number from the `input` range that is going to be mapped to
 *   the `output` range.
 * @param inputRange - An array of numbers specifying the input range of the
 *   interpolation.
 * @param outputRange - An array of numbers specifying the output range of the
 *   interpolation.
 * @param extrapolate - Determines what happens when the `value` goes beyond the
 *   `input` range. Defaults to `Extrapolation.EXTEND` -
 *   {@link ExtrapolationType}.
 * @returns A mapped value within the output range.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/utilities/interpolate
 */
export declare function interpolate(x: number, inputRange: readonly number[], outputRange: readonly number[], type?: ExtrapolationType): number;
/**
 * Lets you limit a value within a specified range.
 *
 * @param value - A number that will be returned as long as the provided value
 *   is in range between `min` and `max`.
 * @param min - A number which will be returned when provided `value` is lower
 *   than `min`.
 * @param max - A number which will be returned when provided `value` is higher
 *   than `max`.
 * @returns A number between min and max bounds.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/utilities/clamp/
 */
export declare function clamp(value: number, min: number, max: number): number;
export {};
//# sourceMappingURL=interpolation.d.ts.map