import { round, color, interpolate, Extrapolate } from '../base';

/**
 * Use this if you want to interpolate an `Animated.Value` into color values.
 *
 * #### Why is this needed?
 *
 * Unfortunately, if you'll pass color values directly into the `outputRange` option
 * of `interpolate()` function, that won't really work (at least at the moment).
 * See https://github.com/software-mansion/react-native-reanimated/issues/181 .
 *
 * So, for now you can just use this helper instead.
 */
export default function interpolateColors(animationValue, options) {
  const { inputRange, outputRgbaRange: rgbaColors } = options;

  const r = round(
    interpolate(animationValue, {
      inputRange,
      outputRange: rgbaColors.map(c => c[0]),
      extrapolate: Extrapolate.CLAMP,
    })
  );
  const g = round(
    interpolate(animationValue, {
      inputRange,
      outputRange: rgbaColors.map(c => c[1]),
      extrapolate: Extrapolate.CLAMP,
    })
  );
  const b = round(
    interpolate(animationValue, {
      inputRange,
      outputRange: rgbaColors.map(c => c[2]),
      extrapolate: Extrapolate.CLAMP,
    })
  );
  const a = interpolate(animationValue, {
    inputRange,
    outputRange: rgbaColors.map(c => c[3]),
    extrapolate: Extrapolate.CLAMP,
  });

  return color(r, g, b, a);
}
