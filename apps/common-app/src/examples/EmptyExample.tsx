import React from 'react';
import { View } from 'react-native';
import Animated, {
  createWorkletRuntime,
  Easing,
  FadeIn,
  getViewProp,
  interpolate,
  interpolateColor,
  measure,
  runOnRuntime,
  runOnUI,
  setNativeProps,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withClamp,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const SHOW_EXAMPLE: number = -2;

/** [-1]
 * Error: [Reanimated] Property `text` was whitelisted both as UI and native prop. Please remove it from
 * one of the lists.
 */
if (SHOW_EXAMPLE === -1) {
  Animated.addWhitelistedNativeProps({ text: true });
  Animated.addWhitelistedUIProps({ text: true });
}

/** [0]
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

/** [1]
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

/** [2]
 * Warning: Error: [Reanimated] Function `getViewProp` requires a component to be passed as an argument * on Fabric.
 */
function GetViewPropError() {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  getViewProp(-1, 'opacity');

  return null;
}

/** [3]
 * Warning: Error: [Reanimated] Invalid color space provided: INVALID. Supported values are: ['RGB',
 * 'HSV'].
 */
function InterpolateColorError() {
  interpolateColor(0, [0, 1], ['red', 'blue'], 'INVALID' as 'RGB');
  return null;
}

/** [4]
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

/** [5]
 * Warning: Error: [Reanimated] [Reanimated] Unsupported value for "interpolate"
 * Supported values: ["extend", "clamp", "identity", Extrapolatation.CLAMP, Extrapolatation.EXTEND
 * Extrapolatation.IDENTITY]
 * Valid example:
 *    interpolate(value, [inputRange], [outputRange], \{
 *      extrapolateLeft: Extrapolation.CLAMP,
 *      extrapolateRight: Extrapolation.IDENTITY
 *    \}\}
 */
function InterpolationExtrapolateError2() {
  interpolate(0, [0, 1], [0, 1], {
    extrapolateLeft: 'INVALID' as 'clamp',
    extrapolateRight: 'clamp',
  });
  return null;
}

/** [6]
 * Warning: Error: [Reanimated] Interpolation input and output ranges should contain at least two values.
 */
function InterpolationInputOutputError() {
  interpolate(0, [0, 1], [0] /* should have at least 2 values */);
  return null;
}

/** [7]
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

/** [8]
 * Warning: Error: [Reanimated] The function passed to `runOnRuntime` is not a worklet.
 */
function RunOnRuntimeError() {
  const runtime = createWorkletRuntime('foo');
  runOnRuntime(runtime, () => {
    /* NOT A WORKLET */
  });

  return null;
}

/** [9]
 * (Doesn't show proper stack in both cases - animation is started asynchronously, so the
 * warning doesn't point to the component)
 *
 * [Reanimated] Wrong config was provided to withClamp. Min value is bigger than max
 */
function WrongClampConfigWarning() {
  const sv = useSharedValue(0);
  sv.value = withClamp({ min: 1, max: 0 }, withTiming(1));
  return null;
}

/** [10]
 * [Reanimated] No animation was provided for the sequence
 */
function NoAnimationProvidedForTheSequenceWarning() {
  withSequence();
  return null;
}

/** [11]
 * (Doesn't show proper stack in both cases - similar case to the previous one)
 *
 * [Reanimated] Invalid spring config, stiffness must be grater than zero but got 0, damping
 * must be grater than zero but got 0
 */
function InvalidSpringConfigWarning() {
  const sv = useSharedValue(0);
  sv.value = withSpring(0, {
    damping: 0,
    stiffness: 0,
  });
  return null;
}

/** [12]
 * Warning: Error: [Reanimated] The easing function is not a worklet. Please make sure you
 * import `Easing` from react-native-reanimated.
 */
function EasingFunctionIsNotAWorkletError() {
  const sv = useSharedValue(0);
  sv.value = withTiming(1, {
    easing: () => 0,
  });
  return null;
}

/** [13]
 * Warning: Error: [Reanimated] `useAnimatedStyle` has to return an object, found undefined
 * instead.
 */
function UseAnimatedStyleHasToReturnAnObjectError() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useAnimatedStyle(() => undefined as any);

  return null;
}

/** [14]
 * [Reanimated] The view with tag -1 is not a valid argument for measure(). This may be because
 * the view is not currently rendered, which may not be a bug (e.g. an off-screen FlatList
 * item).
 */
function MeasureInvalidTagWarning() {
  const animatedRef = useAnimatedRef();
  runOnUI(() => {
    measure(animatedRef);
  })();
  return null;
}

/** [15]
 * [Reanimated] setNativeProps() can only be used on the UI runtime.
 */
function SetNativePropsCanOnlyBeCalledOnUIRuntime() {
  const animatedRef = useAnimatedRef();
  setNativeProps(animatedRef, {});
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
  WrongClampConfigWarning,
  NoAnimationProvidedForTheSequenceWarning,
  InvalidSpringConfigWarning,
  EasingFunctionIsNotAWorkletError,
  UseAnimatedStyleHasToReturnAnObjectError,
  MeasureInvalidTagWarning,
  SetNativePropsCanOnlyBeCalledOnUIRuntime,
];

export default function EmptyExample() {
  return EXAMPLES[SHOW_EXAMPLE]?.();
}
