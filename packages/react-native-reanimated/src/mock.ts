'use strict';

import type { ReactNode } from 'react';
import {
  Animated as AnimatedRN,
  Image as ImageRN,
  processColor as processColorRN,
  Text as TextRN,
  View as ViewRN,
} from 'react-native';

import type {
  AnimatableValue,
  AnimationCallback,
  EventHandler,
  EventHandlerProcessed,
  WithDecayConfig,
  WithSpringConfig,
  WithTimingConfig,
} from './index';
import {
  advanceAnimationByFrame,
  advanceAnimationByTime,
  contrastColor,
  convertToRGBA,
  css as cssStyleSheet,
  cubicBezier,
  DynamicColorIOS,
  Extrapolation,
  GentleSpringConfig,
  GentleSpringConfigWithDuration,
  getAnimatedStyle,
  getUseOfValueInStyleWarning,
  InterfaceOrientation,
  IOSReferenceFrame,
  isColor,
  isSharedValue as isSharedValueReal,
  isWorkletFunction,
  KeyboardState,
  linear,
  PlatformColor,
  Reanimated3DefaultSpringConfig,
  Reanimated3DefaultSpringConfigWithDuration,
  ReanimatedLogLevel,
  reanimatedVersion,
  ReduceMotion,
  ScreenTransition as ScreenTransitionPresets,
  SensorType,
  setUpTests,
  SnappySpringConfig,
  SnappySpringConfigWithDuration,
  steps,
  WigglySpringConfig,
  WigglySpringConfigWithDuration,
  withReanimatedTimer,
} from './index';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const NOOP = () => {};
const NOOP_FACTORY = () => NOOP;
const ID = <T>(t: T) => t;
const IMMEDIATE_CALLBACK_INVOCATION = <T>(callback: () => T) => callback();

const hook = {
  useAnimatedKeyboard: () => ({ height: 0, state: 0 }),
  useAnimatedProps: IMMEDIATE_CALLBACK_INVOCATION,
  useAnimatedReaction: NOOP,
  useAnimatedRef: () => ({ current: null }),
  useAnimatedScrollHandler: NOOP_FACTORY,
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
  useAnimatedStyle: IMMEDIATE_CALLBACK_INVOCATION,
  useComposedEventHandler: NOOP_FACTORY,
  useDerivedValue: <Value>(processor: () => Value) => {
    const result = processor();

    return { value: result, get: () => result };
  },
  useEvent: <
    Event extends object,
    Context extends Record<string, unknown> = never,
  >(
    _handler: EventHandler<Event, Context>,
    _eventNames?: string[],
    _rebuild?: boolean
  ): EventHandlerProcessed<Event, Context> => NOOP,
  useFrameCallback: () => ({
    callbackId: -1,
    isActive: false,
    setActive: NOOP,
  }),
  useHandler: () => ({
    context: {},
    doDependenciesDiffer: false,
    useWeb: false,
  }),
  useReducedMotion: () => false,
  useScrollOffset: () => ({ value: 0 }),
  useScrollViewOffset: () => ({ value: 0 }),
  useSharedValue: <Value>(init: Value) => {
    const value = { value: init };
    return new Proxy(value, {
      get(target, prop) {
        if (prop === '_isReanimatedSharedValue') {
          return true;
        }
        if (prop === 'value') {
          return target.value;
        }
        if (prop === 'get') {
          return () => target.value;
        }
        if (prop === 'set') {
          return (newValue: Value | ((currentValue: Value) => Value)) => {
            if (typeof newValue === 'function') {
              target.value = (newValue as (currentValue: Value) => Value)(
                target.value
              );
            } else {
              target.value = newValue;
            }
          };
        }
      },
      set(target, prop: string, newValue) {
        if (prop === 'value') {
          target.value = newValue;
          return true;
        }
        return false;
      },
    });
  },
  useTimestamp: () => ({ value: 0 }),
};

const animation = {
  cancelAnimation: NOOP,
  defineAnimation: <T>(_starting: unknown, factory: () => T) => factory(),
  GentleSpringConfig,
  GentleSpringConfigWithDuration,
  Reanimated3DefaultSpringConfig,
  Reanimated3DefaultSpringConfigWithDuration,
  SnappySpringConfig,
  SnappySpringConfigWithDuration,
  WigglySpringConfig,
  WigglySpringConfigWithDuration,
  withClamp: <T>(_config: unknown, animationToClamp: T) => animationToClamp,
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
  clamp: NOOP,
  Extrapolation,
  interpolate: NOOP,
};

const interpolateColor = {
  Extrapolate: Extrapolation,
  Extrapolation,
  interpolateColor: NOOP,
};

const Easing = {
  cubicBezier,
  Easing: {
    back: ID,
    bezier: () => ({ factory: ID }),
    bezierFn: ID,
    bounce: ID,
    circle: ID,
    cubic: ID,
    ease: ID,
    elastic: ID,
    exp: ID,
    in: ID,
    inOut: ID,
    linear: ID,
    out: ID,
    poly: ID,
    quad: ID,
    sin: ID,
    steps: ID,
  },
  linear,
  steps,
};

const platformFunctions = {
  dispatchCommand: NOOP,
  getRelativeCoords: () => ({ x: 0, y: 0 }),
  measure: () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    pageX: 0,
    pageY: 0,
  }),
  scrollTo: NOOP,
  setGestureState: NOOP,
  setNativeProps: NOOP,
};

const Colors = {
  contrastColor,
  convertToRGBA,
  DynamicColorIOS,
  isColor,
  PlatformColor,
  processColor: processColorRN,
};

const PropAdapters = {
  createAnimatedPropAdapter: ID,
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

  energyThreshold() {
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

class NativeEventsManagerMock {
  attachEvents = NOOP;
  detachEvents = NOOP;
  updateEvents = NOOP;
}

const core = {
  configureReanimatedLogger: NOOP,
  createAnimatedComponent: ID,
  createCSSAnimatedComponent: ID,
  createWorkletRuntime: NOOP,
  enableLayoutAnimations: NOOP,
  executeOnUIRuntimeSync: ID,
  getDynamicFeatureFlag: () => false,
  getStaticFeatureFlag: () => false,
  getViewProp: () => Promise.resolve(undefined),
  isConfigured: () => false,
  isReanimated3: () => false,
  isWorkletFunction,
  makeMutable: ID,
  makeShareableCloneRecursive: ID,
  NativeEventsManager: NativeEventsManagerMock,
  ReanimatedLogLevel,
  runOnJS: ID,
  runOnRuntime: NOOP,
  runOnUI: ID,
  setDynamicFeatureFlag: NOOP,
};

const layoutReanimation = {
  BaseAnimationBuilder: new BaseAnimationMock(),
  BounceIn: new BaseAnimationMock(),
  BounceInDown: new BaseAnimationMock(),
  BounceInLeft: new BaseAnimationMock(),
  BounceInRight: new BaseAnimationMock(),
  BounceInUp: new BaseAnimationMock(),
  BounceOut: new BaseAnimationMock(),
  BounceOutDown: new BaseAnimationMock(),
  BounceOutLeft: new BaseAnimationMock(),
  BounceOutRight: new BaseAnimationMock(),
  BounceOutUp: new BaseAnimationMock(),
  ComplexAnimationBuilder: new BaseAnimationMock(),
  CurvedTransition: new BaseAnimationMock(),
  EntryExitTransition: new BaseAnimationMock(),
  FadeIn: new BaseAnimationMock(),
  FadeInDown: new BaseAnimationMock(),
  FadeInLeft: new BaseAnimationMock(),
  FadeInRight: new BaseAnimationMock(),
  FadeInUp: new BaseAnimationMock(),
  FadeOut: new BaseAnimationMock(),
  FadeOutDown: new BaseAnimationMock(),
  FadeOutLeft: new BaseAnimationMock(),
  FadeOutRight: new BaseAnimationMock(),
  FadeOutUp: new BaseAnimationMock(),
  FadingTransition: new BaseAnimationMock(),
  FlipInEasyX: new BaseAnimationMock(),
  FlipInEasyY: new BaseAnimationMock(),
  FlipInXDown: new BaseAnimationMock(),
  FlipInXUp: new BaseAnimationMock(),
  FlipInYLeft: new BaseAnimationMock(),
  FlipInYRight: new BaseAnimationMock(),
  FlipOutEasyX: new BaseAnimationMock(),
  FlipOutEasyY: new BaseAnimationMock(),
  FlipOutXDown: new BaseAnimationMock(),
  FlipOutXUp: new BaseAnimationMock(),
  FlipOutYLeft: new BaseAnimationMock(),
  FlipOutYRight: new BaseAnimationMock(),
  JumpingTransition: new BaseAnimationMock(),
  Keyframe: BaseAnimationMock,
  Layout: new BaseAnimationMock(),
  LightSpeedInLeft: new BaseAnimationMock(),
  LightSpeedInRight: new BaseAnimationMock(),
  LightSpeedOutLeft: new BaseAnimationMock(),
  LightSpeedOutRight: new BaseAnimationMock(),
  LinearTransition: new BaseAnimationMock(),
  PinwheelIn: new BaseAnimationMock(),
  PinwheelOut: new BaseAnimationMock(),
  RollInLeft: new BaseAnimationMock(),
  RollInRight: new BaseAnimationMock(),
  RollOutLeft: new BaseAnimationMock(),
  RollOutRight: new BaseAnimationMock(),
  RotateInDownLeft: new BaseAnimationMock(),
  RotateInDownRight: new BaseAnimationMock(),
  RotateInUpLeft: new BaseAnimationMock(),
  RotateInUpRight: new BaseAnimationMock(),
  RotateOutDownLeft: new BaseAnimationMock(),
  RotateOutDownRight: new BaseAnimationMock(),
  RotateOutUpLeft: new BaseAnimationMock(),
  RotateOutUpRight: new BaseAnimationMock(),
  SequencedTransition: new BaseAnimationMock(),
  SharedTransition: new BaseAnimationMock(),
  SlideInDown: new BaseAnimationMock(),
  SlideInLeft: new BaseAnimationMock(),
  SlideInRight: new BaseAnimationMock(),
  SlideInUp: new BaseAnimationMock(),
  SlideOutDown: new BaseAnimationMock(),
  SlideOutLeft: new BaseAnimationMock(),
  SlideOutRight: new BaseAnimationMock(),
  SlideOutUp: new BaseAnimationMock(),
  StretchInX: new BaseAnimationMock(),
  StretchInY: new BaseAnimationMock(),
  StretchOutX: new BaseAnimationMock(),
  StretchOutY: new BaseAnimationMock(),
  ZoomIn: new BaseAnimationMock(),
  ZoomInDown: new BaseAnimationMock(),
  ZoomInEasyDown: new BaseAnimationMock(),
  ZoomInEasyUp: new BaseAnimationMock(),
  ZoomInLeft: new BaseAnimationMock(),
  ZoomInRight: new BaseAnimationMock(),
  ZoomInRotate: new BaseAnimationMock(),
  ZoomInUp: new BaseAnimationMock(),
  ZoomOut: new BaseAnimationMock(),
  ZoomOutDown: new BaseAnimationMock(),
  ZoomOutEasyDown: new BaseAnimationMock(),
  ZoomOutEasyUp: new BaseAnimationMock(),
  ZoomOutLeft: new BaseAnimationMock(),
  ZoomOutRight: new BaseAnimationMock(),
  ZoomOutRotate: new BaseAnimationMock(),
  ZoomOutUp: new BaseAnimationMock(),
};

const isSharedValue = {
  isSharedValue: isSharedValueReal,
};

const commonTypes = {
  InterfaceOrientation,
  IOSReferenceFrame,
  KeyboardState,
  ReduceMotion,
  SensorType,
};

const pluginUtils = {
  getUseOfValueInStyleWarning,
};

const jestUtils = {
  advanceAnimationByFrame,
  advanceAnimationByTime,
  getAnimatedStyle,
  setUpTests,
  withReanimatedTimer,
};

const LayoutAnimationConfig = {
  LayoutAnimationConfig: ({ children }: { children: ReactNode }) => children,
};

const mappers = {
  startMapper: () => 0,
  stopMapper: NOOP,
};

const components = {
  PerformanceMonitor: () => null,
  ReducedMotionConfig: () => null,
  SharedTransitionBoundary: ({ children }: { children: ReactNode }) => children,
};

const css = {
  css: cssStyleSheet,
};

const screenTransition = {
  finishScreenTransition: NOOP,
  ScreenTransition: ScreenTransitionPresets,
  startScreenTransition: NOOP,
};

const Animated = {
  addWhitelistedNativeProps: NOOP,
  addWhitelistedUIProps: NOOP,
  clamp: NOOP,
  createAnimatedComponent: ID,
  Extrapolate: Extrapolation,
  FlatList: AnimatedRN.FlatList,
  Image: ImageRN,
  interpolate: NOOP,
  interpolateColor: NOOP,
  ScrollView: AnimatedRN.ScrollView,
  Text: TextRN,
  View: ViewRN,
};

const Reanimated = {
  ...animation,
  ...Colors,
  ...commonTypes,
  ...components,
  ...core,
  ...css,
  ...Easing,
  ...hook,
  ...interpolateColor,
  ...interpolation,
  ...isSharedValue,
  ...jestUtils,
  ...LayoutAnimationConfig,
  ...layoutReanimation,
  ...mappers,
  ...platformFunctions,
  ...pluginUtils,
  ...PropAdapters,
  ...screenTransition,
};

module.exports = {
  __esModule: true,
  reanimatedVersion,
  ...Reanimated,
  default: Animated,
};
