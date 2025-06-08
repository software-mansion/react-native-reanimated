'use strict';

import './publicGlobals';

import * as Animated from './Animated';

export default Animated;

// Animation types and functions
export type {
  DecayAnimation,
  DelayAnimation,
  RepeatAnimation,
  SequenceAnimation,
  SpringAnimation,
  StyleLayoutAnimation,
  TimingAnimation,
  WithDecayConfig,
  WithSpringConfig,
  WithTimingConfig,
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

// Color related exports
export type { ParsedColorArray } from './Colors';
export { convertToRGBA, isColor } from './Colors';
export { processColor } from './common';

// Common types
export type {
  AnimatableValue,
  AnimatableValueObject,
  AnimatedKeyboardInfo,
  AnimatedKeyboardOptions,
  AnimatedSensor,
  AnimatedStyle,
  AnimatedTransform,
  AnimateStyle,
  Animation,
  AnimationCallback,
  AnimationObject,
  BaseLayoutAnimationConfig,
  EasingFunction,
  EntryAnimationsValues,
  EntryExitAnimationFunction,
  ExitAnimationsValues,
  IEntryExitAnimationBuilder,
  ILayoutAnimationBuilder,
  KeyframeProps,
  LayoutAnimation,
  LayoutAnimationFunction,
  LayoutAnimationStartFunction,
  LayoutAnimationValues as LayoutAnimationsValues,
  LayoutAnimationType,
  MeasuredDimensions,
  SensorConfig,
  SharedValue,
  StyleProps,
  StylesOrDefault,
  TransformArrayItem,
  Value3D,
  ValueRotation,
} from './commonTypes';
export {
  InterfaceOrientation,
  IOSReferenceFrame,
  KeyboardState,
  ReduceMotion,
  SensorType,
} from './commonTypes';

// Component related exports
export type { FlatListPropsWithLayout } from './component/FlatList';
export { LayoutAnimationConfig } from './component/LayoutAnimationConfig';
export type { PerformanceMonitorProps } from './component/PerformanceMonitor';
export { PerformanceMonitor } from './component/PerformanceMonitor';
export { ReducedMotionConfig } from './component/ReducedMotionConfig';
export type { AnimatedScrollViewProps } from './component/ScrollView';

// Core functionality
export { configureReanimatedLogger } from './ConfigHelper';
export {
  createWorkletRuntime,
  enableLayoutAnimations,
  executeOnUIRuntimeSync,
  getViewProp,
  isConfigured,
  isReanimated3,
  makeMutable,
  makeShareableCloneRecursive,
  runOnJS,
  runOnRuntime,
  runOnUI,
} from './core';

// CSS and Easing
export * from './css';
export type {
  EasingFactoryFn,
  EasingFn,
  EasingFunctionFactory,
} from './Easing';
export { Easing } from './Easing';

// Frame and helper types
export type { FrameInfo } from './frameCallback';
export type {
  Adaptable,
  AdaptTransforms,
  AnimatedProps,
  AnimatedStyleProp,
  AnimateProps,
  EntryOrExitLayoutType,
  TransformStyleTypes,
} from './helperTypes';

// Hook related exports
export type {
  AnimatedRef,
  DerivedValue,
  EventHandler,
  EventHandlerProcessed,
  FrameCallback,
  GestureHandlers,
  ReanimatedEvent,
  ScrollEvent,
  ScrollHandler,
  ScrollHandlerProcessed,
  ScrollHandlers,
  UseHandlerContext,
} from './hook';
export {
  useAnimatedGestureHandler,
  useAnimatedKeyboard,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedSensor,
  useAnimatedStyle,
  useComposedEventHandler,
  useDerivedValue,
  useEvent,
  useFrameCallback,
  useHandler,
  useReducedMotion,
  useScrollOffset,
  /** @deprecated Please use {@link useScrollOffset} instead. */
  useScrollOffset as useScrollViewOffset,
  useSharedValue,
  useSharedArray,
  useWorkletCallback,
} from './hook';

// Interpolation related exports
export type {
  InterpolateConfig,
  InterpolateHSV,
  InterpolateRGB,
  InterpolationOptions,
} from './interpolateColor';
export {
  ColorSpace,
  /** @deprecated Please use {@link Extrapolation} instead. */
  Extrapolate,
  interpolateColor,
  useInterpolateConfig,
} from './interpolateColor';
export type { ExtrapolationConfig, ExtrapolationType } from './interpolation';
export { clamp, Extrapolation, interpolate } from './interpolation';

// Utility functions
export { isSharedValue } from './isSharedValue';
export {
  advanceAnimationByFrame,
  advanceAnimationByTime,
  getAnimatedStyle,
  setUpTests,
  withReanimatedTimer,
} from './jestUtils';

// Layout reanimation exports
export type { ReanimatedKeyframe } from './layoutReanimation';
export {
  BaseAnimationBuilder,
  // Bounce
  BounceIn,
  BounceInDown,
  BounceInLeft,
  BounceInRight,
  BounceInUp,
  BounceOut,
  BounceOutDown,
  BounceOutLeft,
  BounceOutRight,
  BounceOutUp,
  combineTransition,
  ComplexAnimationBuilder,
  CurvedTransition,
  EntryExitTransition,
  // Fade
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutLeft,
  FadeOutRight,
  FadeOutUp,
  FadingTransition,
  FlipInEasyX,
  FlipInEasyY,
  FlipInXDown,
  // Flip
  FlipInXUp,
  FlipInYLeft,
  FlipInYRight,
  FlipOutEasyX,
  FlipOutEasyY,
  FlipOutXDown,
  FlipOutXUp,
  FlipOutYLeft,
  FlipOutYRight,
  JumpingTransition,
  Keyframe,
  // Transitions
  Layout,
  LightSpeedInLeft,
  // Lightspeed
  LightSpeedInRight,
  LightSpeedOutLeft,
  LightSpeedOutRight,
  LinearTransition,
  // Pinwheel
  PinwheelIn,
  PinwheelOut,
  // Roll
  RollInLeft,
  RollInRight,
  RollOutLeft,
  RollOutRight,
  // Rotate
  RotateInDownLeft,
  RotateInDownRight,
  RotateInUpLeft,
  RotateInUpRight,
  RotateOutDownLeft,
  RotateOutDownRight,
  RotateOutUpLeft,
  RotateOutUpRight,
  SequencedTransition,
  SlideInDown,
  SlideInLeft,
  // Slide
  SlideInRight,
  SlideInUp,
  SlideOutDown,
  SlideOutLeft,
  SlideOutRight,
  SlideOutUp,
  // Stretch
  StretchInX,
  StretchInY,
  StretchOutX,
  StretchOutY,
  // Zoom
  ZoomIn,
  ZoomInDown,
  ZoomInEasyDown,
  ZoomInEasyUp,
  ZoomInLeft,
  ZoomInRight,
  ZoomInRotate,
  ZoomInUp,
  ZoomOut,
  ZoomOutDown,
  ZoomOutEasyDown,
  ZoomOutEasyUp,
  ZoomOutLeft,
  ZoomOutRight,
  ZoomOutRotate,
  ZoomOutUp,
} from './layoutReanimation';

// Mapper and platform functions
export { startMapper, stopMapper } from './mappers';
export type { ComponentCoords } from './platformFunctions';
export {
  dispatchCommand,
  getRelativeCoords,
  measure,
  scrollTo,
  setGestureState,
  setNativeProps,
} from './platformFunctions';

// Plugin and prop adapters
export { getUseOfValueInStyleWarning } from './pluginUtils';
export { createAnimatedPropAdapter } from './PropAdapters';

// Screen transition
export type {
  AnimatedScreenTransition,
  GoBackGesture,
  ScreenTransitionConfig,
} from './screenTransition';
export {
  finishScreenTransition,
  ScreenTransition,
  startScreenTransition,
} from './screenTransition';

// Worklet related exports
export type { WorkletRuntime } from 'react-native-worklets';
export {
  isWorkletFunction,
  LogLevel as ReanimatedLogLevel,
} from 'react-native-worklets';
