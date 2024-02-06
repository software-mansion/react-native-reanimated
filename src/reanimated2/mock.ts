/* eslint-disable n/no-callback-literal */
'use strict';

import type { WithSpringConfig, WithTimingConfig } from './animation';
import type { DecayConfig } from './animation/decay/utils';
import type { AnimatableValue, AnimationCallback } from './commonTypes';
import {
  IOSReferenceFrame,
  InterfaceOrientation,
  KeyboardState,
  ReduceMotion,
  SensorType,
} from './commonTypes';
import { ColorSpace, Extrapolate } from './interpolateColor';
import { Extrapolation } from './interpolation';
import { SharedTransitionType } from './layoutReanimation';

const NOOP = () => {};
const NOOP_FACTORY = () => NOOP;
const ID = <T>(t: T) => t;
const IMMEDIATE_CALLBACK_INVOCATION = <T>(callback: () => T) => callback();
const NOOP_PROXY_FACTORY = () =>
  new Proxy(
    {},
    {
      get: NOOP,
    }
  );

const hook = {
  useAnimatedProps: IMMEDIATE_CALLBACK_INVOCATION,
  useEvent: NOOP_PROXY_FACTORY, // should be fine?
  useHandler: NOOP_PROXY_FACTORY, // should be fine?
  useWorkletCallback: ID,
  useSharedValue: <Value>(init: Value) => ({ value: init }),
  useReducedMotion: NOOP, // should be fine?
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
  useFrameCallback: IMMEDIATE_CALLBACK_INVOCATION, // should be fine?
  useAnimatedKeyboard: () => ({ height: 0, state: 0 }),
  useScrollViewOffset: () => ({ value: 0 }), // should be fine?
};

const animation = {
  cancelAnimation: NOOP,
  defineAnimation: NOOP_FACTORY, // ?
  withClamp: NOOP_FACTORY, // ?
  withDecay: (_userConfig: DecayConfig, callback?: AnimationCallback) => {
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
  interpolate: ID, // ?
  clamp: ID, // ?
};

const interpolateColor = {
  Extrapolate,
  ColorSpace,
  interpolateColor: ID, // ?
  useInterpolateConfig: NOOP_FACTORY, // ?
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
  dispatchCommand: NOOP, // ?
  scrollTo: NOOP, // ?
  setGestureState: NOOP, // ?
  setNativeProps: NOOP, // ?
  getRelativeCoords: ID, // ?
};

const Colors = {
  isColor: () => true, // ?
  processColor: ID, // ?
  convertToRGBA: ID, // ?
};

const PropAdapters = {
  createAnimatedPropAdapter: NOOP_FACTORY, // ?
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
  isConfigured: () => true, // ?
  enableLayoutAnimations: NOOP,
  getViewProp: ID, // ?
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
  combineTransitions: ID, // ?
  // SET
  SharedTransition: new BaseAnimationMock(), // ?
  SharedTransitionType,
};

const isSharedValue = {
  isSharedValue: () => true, // ?
};

const commonTypes = {
  SensorType,
  IOSReferenceFrame,
  InterfaceOrientation,
  KeyboardState,
  ReduceMotion,
};

const pluginUtils = {
  getUseOfValueInStyleWarning: NOOP, // ?
};

// const jestUtils ???

const LayoutAnimationConfig = {
  LayoutAnimationConfig: NOOP_FACTORY, // ?
};

const mappers = {
  startMapper: NOOP, // ?
  stopMapper: NOOP, // ?
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
  ...LayoutAnimationConfig,
  ...mappers,
};

module.exports = {
  ...Reanimated,
};
