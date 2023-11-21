/* eslint-disable node/no-callback-literal */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
'use strict';

import { ReduceMotion, SensorType } from './commonTypes';

const NOOP = () => {
  // noop
};
const ID = (t) => t;
const IMMEDIATE_CB_INVOCATION = (cb: () => unknown) => cb();

class BaseAnimationMock {
  createInstance() {
    return this;
  }

  duration(_: number) {
    return this;
  }

  delay(_: number) {
    return this;
  }

  springify(_: number) {
    return this;
  }

  damping(_: number) {
    return this;
  }

  stiffness(_: number) {
    return this;
  }

  withCallback(_: (finished: boolean) => void) {
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

  reduceMotion(_: ReduceMotion) {
    return this;
  }
}

const ReanimatedV2 = {
  useSharedValue: (v) => ({ value: v }),
  useDerivedValue: (a) => ({ value: a() }),
  useAnimatedScrollHandler: () => NOOP,
  useAnimatedGestureHandler: () => NOOP,
  useAnimatedStyle: IMMEDIATE_CB_INVOCATION,
  useAnimatedRef: () => ({ current: null }),
  useAnimatedReaction: NOOP,
  useAnimatedProps: IMMEDIATE_CB_INVOCATION,
  ReduceMotion: ReduceMotion,
  SensorType: SensorType,
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

  withTiming: (toValue, _, cb) => {
    cb && cb(true);
    return toValue;
  },
  withSpring: (toValue, _, cb) => {
    cb && cb(true);
    return toValue;
  },
  withDecay: (_, cb) => {
    cb && cb(true);
    return 0;
  },
  withDelay: (_, animationValue) => {
    return animationValue;
  },
  withSequence: (..._animations) => {
    return 0;
  },
  withRepeat: (animation) => {
    return animation;
  },
  cancelAnimation: NOOP,
  measure: () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    pageX: 0,
    pageY: 0,
  }),
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
  Extrapolation: {
    EXTEND: 'extend',
    CLAMP: 'clamp',
    IDENTITY: 'identity',
  },

  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
};

[
  'FadeIn',
  'FadeInRight',
  'FadeInLeft',
  'FadeInUp',
  'FadeInDown',
  'FadeOut',
  'FadeOutRight',
  'FadeOutLeft',
  'FadeOutUp',
  'FadeOutDown',

  'FlipInYLeft',
  'FlipInXDown',
  'FlipInYRight',
  'FlipInEasyX',
  'FlipInEasyY',
  'FlipOutXUp',
  'FlipOutYLeft',
  'FlipOutXDown',
  'FlipOutYRight',
  'FlipOutEasyX',
  'FlipOutEasyY',

  'StretchInY',
  'StretchOutX',
  'StretchOutY',
  'SlideInLeft',
  'SlideOutRight',
  'SlideOutLeft',
  'SlideInUp',
  'SlideInDown',
  'SlideOutUp',

  'ZoomInRotate',
  'ZoomInLeft',
  'ZoomInRight',
  'ZoomInUp',
  'ZoomInDown',
  'ZoomInEasyUp',
  'ZoomInEasyDown',
  'ZoomOut',
  'ZoomOutRotate',
  'ZoomOutLeft',
  'ZoomOutRight',
  'ZoomOutUp',
  'ZoomOutDown',
  'ZoomOutEasyUp',
  'ZoomOutEasyDown',

  'BounceIn',
  'BounceInDown',
  'BounceInUp',
  'BounceInLeft',
  'BounceInRight',
  'BounceOut',
  'BounceOutDown',
  'BounceOutUp',
  'BounceOutLeft',
  'BounceOutRight',

  'LightSpeedInLeft',
  'LightSpeedOutRight',
  'LightSpeedOutLeft',

  'PinwheelOut',

  'RotateInDownRight',
  'RotateInUpLeft',
  'RotateInUpRight',
  'RotateOutDownLeft',
  'RotateOutDownRight',
  'RotateOutUpLeft',
  'RotateOutUpRight',

  'RollInRight',
  'RollOutLeft',
  'RollOutRight',

  'Layout',
  'CurvedTransition',
  'JumpingTransition',
  'SequencedTransition',
  'FadingTransition',
  'EntryExitTransition',
].forEach((k) =>
  Object.assign(ReanimatedV2, {
    [k]: new BaseAnimationMock(),
  })
);

module.exports = {
  ...ReanimatedV2,
};
