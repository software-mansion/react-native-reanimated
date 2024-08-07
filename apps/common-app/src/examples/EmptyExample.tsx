import React from 'react';
import { View } from 'react-native';
import Animated, {
  createWorkletRuntime,
  Easing,
  FadeIn,
  getViewProp,
  interpolate,
  interpolateColor,
  runOnRuntime,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const SHOW_EXAMPLE: number = 8;

/**
 * Error: [Reanimated] Property `text` was whitelisted both as UI and native prop. Please remove it from
 * one of the lists.
 */
if (SHOW_EXAMPLE === -1) {
  Animated.addWhitelistedNativeProps({ text: true });
  Animated.addWhitelistedUIProps({ text: true });
}

/**
 * (Doesn't show proper stack in both cases - can't be improved as warning is not logged as a result
 * of a function call inside the component)
 *
 * [Reanimated] Property "opacity" of AnimatedComponent(View) may be overwritten by a layout animation. * Please wrap your component with an animated view and apply the layout animation on the wrapper.
 */
function LayoutAnimationOverridePropertiesWarning() {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  return <Animated.View style={animatedStyle} entering={FadeIn} />;
}

/**
 * (Doesn't show proper stack in both cases - similar case to the previous one)
 *
 *  ReanimatedError: [Reanimated] Bezier x values must be in [0, 1] range., js engine: reanimated
 */
function EasingBezierError() {
  const sv = useSharedValue(0);
  sv.value = withTiming(1, {
    easing: Easing.bezier(5 /* should be <= 1 */, 0, 1, 1),
  });
  return null;
}

/**
 * Warning: Error: [Reanimated] Function `getViewProp` requires a component to be passed as an argument * on Fabric.
 */
function GetViewPropError() {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  getViewProp(-1, 'opacity');

  return null;
}

/**
 * Warning: Error: [Reanimated] Invalid color space provided: INVALID. Supported values are: ['RGB',
 * 'HSV'].
 */
function InterpolateColorError() {
  interpolateColor(0, [0, 1], ['red', 'blue'], 'INVALID' as 'RGB');
  return null;
}

/**
 * Warning: Error: [Reanimated] Unsupported value for "interpolate"
 * Supported values: ["extend", "clamp", "identity", Extrapolatation.CLAMP, Extrapolatation.EXTEND,
 * Extrapolatation.IDENTITY]
 * Valid example:
 *        interpolate(value, [inputRange], [outputRange], "clamp")
 */
function InterpolationExtrapolateError1() {
  interpolate(0, [0, 1], [0, 1], 'INVALID' as 'clamp');
  return null;
}

/**
 * Warning: Error: [Reanimated] [Reanimated] Unsupported value for "interpolate"
 * Supported values: ["extend", "clamp", "identity", Extrapolatation.CLAMP, Extrapolatation.EXTEND
 * Extrapolatation.IDENTITY]
 * Valid example:
 *    interpolate(value, [inputRange], [outputRange], {
 *      extrapolateLeft: Extrapolation.CLAMP,
 *      extrapolateRight: Extrapolation.IDENTITY
 *    }}
 */
function InterpolationExtrapolateError2() {
  interpolate(0, [0, 1], [0, 1], {
    extrapolateLeft: 'INVALID' as 'clamp',
    extrapolateRight: 'clamp',
  });
  return null;
}

/**
 * Warning: Error: [Reanimated] Interpolation input and output ranges should contain at least two values.
 */
function InterpolationInputOutputError() {
  interpolate(0, [0, 1], [0] /* should have at least 2 values */);
  return null;
}

/**
 * (We don't get path to this component from metro, so the new implementation doesn't change anything)
 *
 * Warning: Error: [Reanimated] Reading from value directly is not supported. Use `worklet` to read
 * value from the animation state.
 */
function ReadingFromValueDirectlyError() {
  const sv = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    opacity: sv.value,
  }));

  // eslint-disable-next-line reanimated/animated-style-non-animated-component
  return <View style={style} />;
}

function RunOnRuntimeError() {
  const runtime = createWorkletRuntime('foo');
  runOnRuntime(runtime, () => {
    /* NOT A WORKLET */
  });

  return null;
}

const EXAMPLES = [
  LayoutAnimationOverridePropertiesWarning,
  EasingBezierError,
  GetViewPropError,
  InterpolateColorError,
  InterpolationExtrapolateError1,
  InterpolationExtrapolateError2,
  InterpolationInputOutputError,
  ReadingFromValueDirectlyError,
  RunOnRuntimeError,
];

export default function EmptyExample() {
  return EXAMPLES[SHOW_EXAMPLE]?.();
}
