'use strict';

import { Animated as AnimatedRN, Image as ImageRN, processColor as processColorRN, Text as TextRN, View as ViewRN } from 'react-native';
import { advanceAnimationByFrame, advanceAnimationByTime, ColorSpace, Extrapolation, getAnimatedStyle, InterfaceOrientation, IOSReferenceFrame, KeyboardState, reanimatedVersion, ReduceMotion, SensorType, setUpTests, withReanimatedTimer } from "./index.js";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const NOOP = () => {};
const NOOP_FACTORY = () => NOOP;
const ID = t => t;
const IMMEDIATE_CALLBACK_INVOCATION = callback => callback();
const hook = {
  useAnimatedProps: IMMEDIATE_CALLBACK_INVOCATION,
  useEvent: (_handler, _eventNames, _rebuild) => NOOP,
  // useHandler: ADD ME IF NEEDED
  useSharedValue: init => {
    const value = {
      value: init
    };
    return new Proxy(value, {
      get(target, prop) {
        if (prop === 'value') {
          return target.value;
        }
        if (prop === 'get') {
          return () => target.value;
        }
        if (prop === 'set') {
          return newValue => {
            if (typeof newValue === 'function') {
              target.value = newValue(target.value);
            } else {
              target.value = newValue;
            }
          };
        }
      },
      set(target, prop, newValue) {
        if (prop === 'value') {
          target.value = newValue;
          return true;
        }
        return false;
      }
    });
  },
  // useReducedMotion: ADD ME IF NEEDED
  useAnimatedStyle: IMMEDIATE_CALLBACK_INVOCATION,
  useAnimatedReaction: NOOP,
  useAnimatedRef: () => ({
    current: null
  }),
  useAnimatedScrollHandler: NOOP_FACTORY,
  useDerivedValue: processor => {
    const result = processor();
    return {
      value: result,
      get: () => result
    };
  },
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
        roll: 0
      }
    },
    unregister: NOOP,
    isAvailable: false,
    config: {
      interval: 0,
      adjustToInterfaceOrientation: false,
      iosReferenceFrame: 0
    }
  }),
  // useFrameCallback: ADD ME IF NEEDED
  useAnimatedKeyboard: () => ({
    height: 0,
    state: 0
  }),
  useScrollViewOffset: () => ({
    value: 0
  }),
  useScrollOffset: () => ({
    value: 0
  })
};
const animation = {
  cancelAnimation: NOOP,
  // defineAnimation: ADD ME IF NEEDED
  // withClamp: ADD ME IF NEEDED
  withDecay: (_userConfig, callback) => {
    callback?.(true);
    return 0;
  },
  withDelay: (_delayMs, nextAnimation) => {
    return nextAnimation;
  },
  withRepeat: ID,
  withSequence: () => 0,
  withSpring: (toValue, _userConfig, callback) => {
    callback?.(true);
    return toValue;
  },
  withTiming: (toValue, _userConfig, callback) => {
    callback?.(true);
    return toValue;
  }
};
const interpolation = {
  Extrapolation,
  interpolate: NOOP,
  clamp: NOOP
};
const interpolateColor = {
  Extrapolate: Extrapolation,
  Extrapolation,
  ColorSpace,
  interpolateColor: NOOP
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
    bezier: () => ({
      factory: ID
    }),
    bezierFn: ID,
    steps: ID,
    in: ID,
    out: ID,
    inOut: ID
  }
};
const platformFunctions = {
  measure: () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    pageX: 0,
    pageY: 0
  }),
  // dispatchCommand: ADD ME IF NEEDED
  scrollTo: NOOP
  // setGestureState: ADD ME IF NEEDED
  // setNativeProps: ADD ME IF NEEDED
  // getRelativeCoords: ADD ME IF NEEDED
};
const Colors = {
  // isColor: ADD ME IF NEEDED
  processColor: processColorRN
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
  easing(_) {
    return this;
  }
  rotate(_) {
    return this;
  }
  mass(_) {
    return this;
  }
  restDisplacementThreshold(_) {
    return this;
  }
  restSpeedThreshold(_) {
    return this;
  }
  overshootClamping(_) {
    return this;
  }
  dampingRatio(_) {
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
    return () => ({
      initialValues: {},
      animations: {}
    });
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
  createSerializable: ID,
  isReanimated3: () => false,
  // isConfigured: ADD ME IF NEEDED
  enableLayoutAnimations: NOOP
  // getViewProp: ADD ME IF NEEDED
};
const layoutReanimation = {
  BaseAnimationBuilder: new BaseAnimationMock(),
  ComplexAnimationBuilder: new BaseAnimationMock(),
  Keyframe: BaseAnimationMock,
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
  EntryExitTransition: new BaseAnimationMock()
};
const isSharedValue = {
  // isSharedValue: ADD ME IF NEEDED
};
const commonTypes = {
  SensorType,
  IOSReferenceFrame,
  InterfaceOrientation,
  KeyboardState,
  ReduceMotion
};
const pluginUtils = {
  // getUseOfValueInStyleWarning: ADD ME IF NEEDED
};
const jestUtils = {
  withReanimatedTimer,
  advanceAnimationByTime,
  advanceAnimationByFrame,
  setUpTests,
  getAnimatedStyle
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
  addWhitelistedNativeProps: NOOP
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
  ...mappers
};
module.exports = {
  __esModule: true,
  reanimatedVersion,
  ...Reanimated,
  default: Animated
};
//# sourceMappingURL=mock.js.map