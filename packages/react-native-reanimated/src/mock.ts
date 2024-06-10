/* eslint-disable n/no-callback-literal */
'use strict';

import type {
  WithSpringConfig,
  WithTimingConfig,
  WithDecayConfig,
  AnimatableValue,
  AnimationCallback,
} from './index';
import {
  IOSReferenceFrame,
  InterfaceOrientation,
  KeyboardState,
  ReduceMotion,
  SensorType,
  ColorSpace,
  Extrapolation,
  SharedTransitionType,
  withReanimatedTimer,
  advanceAnimationByTime,
  advanceAnimationByFrame,
  setUpTests,
  getAnimatedStyle,
} from './index';
import {
  View as ViewRN,
  Text as TextRN,
  Image as ImageRN,
  Animated as AnimatedRN,
  processColor as processColorRN,
} from 'react-native';

const NOOP = () => {};
const NOOP_FACTORY = () => NOOP;
const ID = <T>(t: T) => t;
const IMMEDIATE_CALLBACK_INVOCATION = <T>(callback: () => T) => callback();

const hook = {
  useAnimatedProps: IMMEDIATE_CALLBACK_INVOCATION,
  // useEvent: ADD ME IF NEEDED
  // useHandler: ADD ME IF NEEDED
  useWorkletCallback: ID,
  useSharedValue: <Value>(init: Value) => ({ value: init }),
  // useReducedMotion: ADD ME IF NEEDED
  useAnimatedStyle: IMMEDIATE_CALLBACK_INVOCATION,
  useAnimatedGestureHandler: NOOP_FACTORY,
  useAnimatedReaction: NOOP,
  useAnimatedRef: () => ({ current: null }),
  useAnimatedScrollHandler: NOOP_FACTORY,
  useDerivedValue: <Value>(processor: () => Value) => ({ value: processor() }),
  useAnimatedSensor: () => ({
    sensor: {
      value: {
        x: 0,
        y: 0,
        z: 0,
        interfaceOrientation: 0,
        qw: 0,
        qx: 0,
        qy: 0,
        qz: 0,
        yaw: 0,
        pitch: 0,
        roll: 0,
      },
    },
    unregister: NOOP,
    isAvailable: false,
    config: {
      interval: 0,
      adjustToInterfaceOrientation: false,
      iosReferenceFrame: 0,
    },
  }),
  // useFrameCallback: ADD ME IF NEEDED
  useAnimatedKeyboard: () => ({ height: 0, state: 0 }),
  // useScrollViewOffset: ADD ME IF NEEDED
};

const animation = {
  cancelAnimation: NOOP,
  // defineAnimation: ADD ME IF NEEDED
  // withClamp: ADD ME IF NEEDED
  withDecay: (_userConfig: WithDecayConfig, callback?: AnimationCallback) => {
    callback?.(true);
    return 0;
  },
  withDelay: <T>(_delayMs: number, nextAnimation: T) => {
    return nextAnimation;
  },
  withRepeat: ID,
  withSequence: () => 0,
  withSpring: (
    toValue: AnimatableValue,
    _userConfig?: WithSpringConfig,
    callback?: AnimationCallback
  ) => {
    callback?.(true);
    return toValue;
  },
  withTiming: (
    toValue: AnimatableValue,
    _userConfig?: WithTimingConfig,
    callback?: AnimationCallback
  ) => {
    callback?.(true);
    return toValue;
  },
};

const interpolation = {
  Extrapolation,
  interpolate: NOOP,
  clamp: NOOP,
};

const interpolateColor = {
  Extrapolate: Extrapolation,
  Extrapolation,
  ColorSpace,
  interpolateColor: NOOP,
  // useInterpolateConfig: ADD ME IF NEEDED
};

const Easing = {
  Easing: {
    linear: ID,
    ease: ID,
    quad: ID,
    cubic: ID,
    poly: ID,
    sin: ID,
    circle: ID,
    exp: ID,
    elastic: ID,
    back: ID,
    bounce: ID,
    bezier: () => ({ factory: ID }),
    bezierFn: ID,
    steps: ID,
    in: ID,
    out: ID,
    inOut: ID,
  },
};

const platformFunctions = {
  measure: () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    pageX: 0,
    pageY: 0,
  }),
  // dispatchCommand: ADD ME IF NEEDED
  scrollTo: NOOP,
  // setGestureState: ADD ME IF NEEDED
  // setNativeProps: ADD ME IF NEEDED
  // getRelativeCoords: ADD ME IF NEEDED
};

const Colors = {
  // isColor: ADD ME IF NEEDED
  processColor: processColorRN,
  // convertToRGBA: ADD ME IF NEEDED
};

const PropAdapters = {
  // createAnimatedPropAdapter: ADD ME IF NEEDED
};

class BaseAnimationMock {
  duration() {
    return this;
  }

  delay() {
    return this;
  }

  springify() {
    return this;
  }

  damping() {
    return this;
  }

  stiffness() {
    return this;
  }

  withCallback() {
    return this;
  }

  randomDelay() {
    return this;
  }

  withInitialValues() {
    return this;
  }

  easing(_: (t: number) => number) {
    return this;
  }

  rotate(_: string) {
    return this;
  }

  mass(_: number) {
    return this;
  }

  restDisplacementThreshold(_: number) {
    return this;
  }

  restSpeedThreshold(_: number) {
    return this;
  }

  overshootClamping(_: number) {
    return this;
  }

  dampingRatio(_: number) {
    return this;
  }

  getDelay() {
    return 0;
  }

  getDelayFunction() {
    return NOOP;
  }

  getDuration() {
    return 300;
  }

  getReduceMotion() {
    return ReduceMotion.System;
  }

  getAnimationAndConfig() {
    return [NOOP, {}];
  }

  build() {
    return () => ({ initialValues: {}, animations: {} });
  }

  reduceMotion() {
    return this;
  }
}

const core = {
  runOnJS: ID,
  runOnUI: ID,
  createWorkletRuntime: NOOP,
  runOnRuntime: NOOP,
  makeMutable: ID,
  makeShareableCloneRecursive: ID,
  isReanimated3: () => true,
  // isConfigured: ADD ME IF NEEDED
  enableLayoutAnimations: NOOP,
  // getViewProp: ADD ME IF NEEDED
};

const layoutReanimation = {
  BaseAnimationBuilder: new BaseAnimationMock(),
  ComplexAnimationBuilder: new BaseAnimationMock(),
  Keyframe: new BaseAnimationMock(),
  // Flip
  FlipInXUp: new BaseAnimationMock(),
  FlipInYLeft: new BaseAnimationMock(),
  FlipInXDown: new BaseAnimationMock(),
  FlipInYRight: new BaseAnimationMock(),
  FlipInEasyX: new BaseAnimationMock(),
  FlipInEasyY: new BaseAnimationMock(),
  FlipOutXUp: new BaseAnimationMock(),
  FlipOutYLeft: new BaseAnimationMock(),
  FlipOutXDown: new BaseAnimationMock(),
  FlipOutYRight: new BaseAnimationMock(),
  FlipOutEasyX: new BaseAnimationMock(),
  FlipOutEasyY: new BaseAnimationMock(),
  // Stretch
  StretchInX: new BaseAnimationMock(),
  StretchInY: new BaseAnimationMock(),
  StretchOutX: new BaseAnimationMock(),
  StretchOutY: new BaseAnimationMock(),
  // Fade
  FadeIn: new BaseAnimationMock(),
  FadeInRight: new BaseAnimationMock(),
  FadeInLeft: new BaseAnimationMock(),
  FadeInUp: new BaseAnimationMock(),
  FadeInDown: new BaseAnimationMock(),
  FadeOut: new BaseAnimationMock(),
  FadeOutRight: new BaseAnimationMock(),
  FadeOutLeft: new BaseAnimationMock(),
  FadeOutUp: new BaseAnimationMock(),
  FadeOutDown: new BaseAnimationMock(),
  // Slide
  SlideInRight: new BaseAnimationMock(),
  SlideInLeft: new BaseAnimationMock(),
  SlideOutRight: new BaseAnimationMock(),
  SlideOutLeft: new BaseAnimationMock(),
  SlideInUp: new BaseAnimationMock(),
  SlideInDown: new BaseAnimationMock(),
  SlideOutUp: new BaseAnimationMock(),
  SlideOutDown: new BaseAnimationMock(),
  // Zoom
  ZoomIn: new BaseAnimationMock(),
  ZoomInRotate: new BaseAnimationMock(),
  ZoomInLeft: new BaseAnimationMock(),
  ZoomInRight: new BaseAnimationMock(),
  ZoomInUp: new BaseAnimationMock(),
  ZoomInDown: new BaseAnimationMock(),
  ZoomInEasyUp: new BaseAnimationMock(),
  ZoomInEasyDown: new BaseAnimationMock(),
  ZoomOut: new BaseAnimationMock(),
  ZoomOutRotate: new BaseAnimationMock(),
  ZoomOutLeft: new BaseAnimationMock(),
  ZoomOutRight: new BaseAnimationMock(),
  ZoomOutUp: new BaseAnimationMock(),
  ZoomOutDown: new BaseAnimationMock(),
  ZoomOutEasyUp: new BaseAnimationMock(),
  ZoomOutEasyDown: new BaseAnimationMock(),
  // Bounce
  BounceIn: new BaseAnimationMock(),
  BounceInDown: new BaseAnimationMock(),
  BounceInUp: new BaseAnimationMock(),
  BounceInLeft: new BaseAnimationMock(),
  BounceInRight: new BaseAnimationMock(),
  BounceOut: new BaseAnimationMock(),
  BounceOutDown: new BaseAnimationMock(),
  BounceOutUp: new BaseAnimationMock(),
  BounceOutLeft: new BaseAnimationMock(),
  BounceOutRight: new BaseAnimationMock(),
  // Lightspeed
  LightSpeedInRight: new BaseAnimationMock(),
  LightSpeedInLeft: new BaseAnimationMock(),
  LightSpeedOutRight: new BaseAnimationMock(),
  LightSpeedOutLeft: new BaseAnimationMock(),
  // Pinwheel
  PinwheelIn: new BaseAnimationMock(),
  PinwheelOut: new BaseAnimationMock(),
  // Rotate
  RotateInDownLeft: new BaseAnimationMock(),
  RotateInDownRight: new BaseAnimationMock(),
  RotateInUpLeft: new BaseAnimationMock(),
  RotateInUpRight: new BaseAnimationMock(),
  RotateOutDownLeft: new BaseAnimationMock(),
  RotateOutDownRight: new BaseAnimationMock(),
  RotateOutUpLeft: new BaseAnimationMock(),
  RotateOutUpRight: new BaseAnimationMock(),
  // Roll
  RollInLeft: new BaseAnimationMock(),
  RollInRight: new BaseAnimationMock(),
  RollOutLeft: new BaseAnimationMock(),
  RollOutRight: new BaseAnimationMock(),
  // Transitions
  Layout: new BaseAnimationMock(),
  LinearTransition: new BaseAnimationMock(),
  FadingTransition: new BaseAnimationMock(),
  SequencedTransition: new BaseAnimationMock(),
  JumpingTransition: new BaseAnimationMock(),
  CurvedTransition: new BaseAnimationMock(),
  EntryExitTransition: new BaseAnimationMock(),
  // combineTransitions: ADD ME IF NEEDED
  // SET
  // SharedTransition: ADD ME IF NEEDED
  SharedTransitionType,
};

const isSharedValue = {
  // isSharedValue: ADD ME IF NEEDED
};

const commonTypes = {
  SensorType,
  IOSReferenceFrame,
  InterfaceOrientation,
  KeyboardState,
  ReduceMotion,
};

const pluginUtils = {
  // getUseOfValueInStyleWarning: ADD ME IF NEEDED
};

const jestUtils = {
  withReanimatedTimer,
  advanceAnimationByTime,
  advanceAnimationByFrame,
  setUpTests,
  getAnimatedStyle,
};

const LayoutAnimationConfig = {
  // LayoutAnimationConfig: ADD ME IF NEEDED
};

const mappers = {
  // startMapper: ADD ME IF NEEDED
  // stopMapper: ADD ME IF NEEDED
};

const Animated = {
  View: ViewRN,
  Text: TextRN,
  Image: ImageRN,
  ScrollView: AnimatedRN.ScrollView,
  FlatList: AnimatedRN.FlatList,
  Extrapolate: Extrapolation,
  interpolate: NOOP,
  interpolateColor: NOOP,
  clamp: NOOP,
  createAnimatedComponent: ID,
  addWhitelistedUIProps: NOOP,
  addWhitelistedNativeProps: NOOP,
};

const Reanimated = {
  ...core,
  ...hook,
  ...animation,
  ...interpolation,
  ...interpolateColor,
  ...Easing,
  ...platformFunctions,
  ...Colors,
  ...PropAdapters,
  ...layoutReanimation,
  ...isSharedValue,
  ...commonTypes,
  ...pluginUtils,
  ...jestUtils,
  ...LayoutAnimationConfig,
  ...mappers,
};

module.exports = {
  __esModule: true,
  ...Reanimated,
  default: Animated,
};
