'use strict';

import './publicGlobals';
import * as Animated from './Animated';

export default Animated;

export type { WorkletRuntime } from './core';
export {
  runOnJS,
  runOnUI,
  createWorkletRuntime,
  runOnRuntime,
  makeMutable,
  makeShareableCloneRecursive,
  isReanimated3,
  isConfigured,
  enableLayoutAnimations,
  getViewProp,
  executeOnUIRuntimeSync,
} from './core';
export type {
  GestureHandlers,
  AnimatedRef,
  DerivedValue,
  ScrollHandler,
  ScrollHandlers,
  ScrollHandlerProcessed,
  FrameCallback,
  ScrollEvent,
  EventHandler,
  EventHandlerProcessed,
  UseHandlerContext,
  ReanimatedEvent,
} from './hook';
export {
  useAnimatedProps,
  useEvent,
  useHandler,
  useWorkletCallback,
  useSharedValue,
  useReducedMotion,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useDerivedValue,
  useAnimatedSensor,
  useFrameCallback,
  useAnimatedKeyboard,
  useScrollViewOffset,
  useComposedEventHandler,
} from './hook';
export type {
  DelayAnimation,
  RepeatAnimation,
  SequenceAnimation,
  StyleLayoutAnimation,
  WithTimingConfig,
  TimingAnimation,
  WithSpringConfig,
  SpringAnimation,
  WithDecayConfig,
  DecayAnimation,
} from './animation';
export {
  cancelAnimation,
  defineAnimation,
  withClamp,
  withDecay,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from './animation';
export type { ExtrapolationConfig, ExtrapolationType } from './interpolation';
export { Extrapolation, interpolate, clamp } from './interpolation';
export type {
  InterpolationOptions,
  InterpolateConfig,
  InterpolateRGB,
  InterpolateHSV,
} from './interpolateColor';
export {
  /**
   * @deprecated Please use {@link Extrapolation} instead.
   */
  Extrapolate,
  ColorSpace,
  interpolateColor,
  useInterpolateConfig,
} from './interpolateColor';
export type {
  EasingFn,
  EasingFunctionFactory,
  EasingFactoryFn,
} from './Easing';
export { Easing } from './Easing';
export type { ComponentCoords } from './platformFunctions';
export {
  measure,
  dispatchCommand,
  scrollTo,
  setGestureState,
  setNativeProps,
  getRelativeCoords,
} from './platformFunctions';
export type { ParsedColorArray } from './Colors';
export { isColor, processColor, convertToRGBA } from './Colors';
export { createAnimatedPropAdapter } from './PropAdapters';
export type {
  LayoutAnimation,
  EntryAnimationsValues,
  ExitAnimationsValues,
  EntryExitAnimationFunction,
  LayoutAnimationsValues,
  LayoutAnimationFunction,
  LayoutAnimationStartFunction,
  LayoutAnimationType,
  SharedTransitionAnimationsValues,
  ILayoutAnimationBuilder,
  IEntryExitAnimationBuilder,
} from './layoutReanimation';
export {
  BaseAnimationBuilder,
  ComplexAnimationBuilder,
  Keyframe,
  // Flip
  FlipInXUp,
  FlipInYLeft,
  FlipInXDown,
  FlipInYRight,
  FlipInEasyX,
  FlipInEasyY,
  FlipOutXUp,
  FlipOutYLeft,
  FlipOutXDown,
  FlipOutYRight,
  FlipOutEasyX,
  FlipOutEasyY,
  // Stretch
  StretchInX,
  StretchInY,
  StretchOutX,
  StretchOutY,
  // Fade
  FadeIn,
  FadeInRight,
  FadeInLeft,
  FadeInUp,
  FadeInDown,
  FadeOut,
  FadeOutRight,
  FadeOutLeft,
  FadeOutUp,
  FadeOutDown,
  // Slide
  SlideInRight,
  SlideInLeft,
  SlideOutRight,
  SlideOutLeft,
  SlideInUp,
  SlideInDown,
  SlideOutUp,
  SlideOutDown,
  // Zoom
  ZoomIn,
  ZoomInRotate,
  ZoomInLeft,
  ZoomInRight,
  ZoomInUp,
  ZoomInDown,
  ZoomInEasyUp,
  ZoomInEasyDown,
  ZoomOut,
  ZoomOutRotate,
  ZoomOutLeft,
  ZoomOutRight,
  ZoomOutUp,
  ZoomOutDown,
  ZoomOutEasyUp,
  ZoomOutEasyDown,
  // Bounce
  BounceIn,
  BounceInDown,
  BounceInUp,
  BounceInLeft,
  BounceInRight,
  BounceOut,
  BounceOutDown,
  BounceOutUp,
  BounceOutLeft,
  BounceOutRight,
  // Lightspeed
  LightSpeedInRight,
  LightSpeedInLeft,
  LightSpeedOutRight,
  LightSpeedOutLeft,
  // Pinwheel
  PinwheelIn,
  PinwheelOut,
  // Rotate
  RotateInDownLeft,
  RotateInDownRight,
  RotateInUpLeft,
  RotateInUpRight,
  RotateOutDownLeft,
  RotateOutDownRight,
  RotateOutUpLeft,
  RotateOutUpRight,
  // Roll
  RollInLeft,
  RollInRight,
  RollOutLeft,
  RollOutRight,
  // Transitions
  Layout,
  LinearTransition,
  FadingTransition,
  SequencedTransition,
  JumpingTransition,
  CurvedTransition,
  EntryExitTransition,
  combineTransition,
  // SET
  SharedTransition,
  SharedTransitionType,
} from './layoutReanimation';
export { isSharedValue } from './isSharedValue';
export type {
  StyleProps,
  SharedValue,
  AnimatableValueObject,
  AnimatableValue,
  AnimationObject,
  SensorConfig,
  Animation,
  AnimatedSensor,
  AnimationCallback,
  Value3D,
  ValueRotation,
  AnimatedKeyboardInfo,
  AnimatedKeyboardOptions,
  MeasuredDimensions,
  EasingFunction,
  AnimatedTransform,
  TransformArrayItem,
  AnimateStyle,
  AnimatedStyle,
  StylesOrDefault,
} from './commonTypes';
export {
  SensorType,
  IOSReferenceFrame,
  InterfaceOrientation,
  KeyboardState,
  ReduceMotion,
  isWorkletFunction,
} from './commonTypes';
export type { FrameInfo } from './frameCallback';
export { getUseOfValueInStyleWarning } from './pluginUtils';
export {
  withReanimatedTimer,
  advanceAnimationByTime,
  advanceAnimationByFrame,
  setUpTests,
  getAnimatedStyle,
} from './jestUtils';
export { LayoutAnimationConfig } from './component/LayoutAnimationConfig';
export { PerformanceMonitor } from './component/PerformanceMonitor';
export type { PerformanceMonitorProps } from './component/PerformanceMonitor';
export { ReducedMotionConfig } from './component/ReducedMotionConfig';
export type {
  Adaptable,
  AdaptTransforms,
  AnimateProps,
  AnimatedProps,
  TransformStyleTypes,
  AnimatedStyleProp,
} from './helperTypes';
export type { AnimatedScrollViewProps } from './component/ScrollView';
export type { FlatListPropsWithLayout } from './component/FlatList';
export { startMapper, stopMapper } from './mappers';
export {
  startScreenTransition,
  finishScreenTransition,
  ScreenTransition,
} from './screenTransition';
export type {
  AnimatedScreenTransition,
  GoBackGesture,
  ScreenTransitionConfig,
} from './screenTransition';
