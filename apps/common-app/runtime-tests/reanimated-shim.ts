// IMPORTANT: this is a temporary stub that lets the runtime-tests bundle avoid
// loading react-native-reanimated entirely. It is wired up by a Metro resolver
// override in apps/fabric-example/metro.config.js: any import of
// `react-native-reanimated` (or `react-native-reanimated/...`) issued by a file
// under `apps/common-app/runtime-tests/` is redirected to this file.
//
// Goal: keep the JS bundle reanimated-free so the native `NativeReanimated`
// constructor never runs, the `installTurboModule` C++ method is never called,
// and the experimental layout-animations commit hook is never registered.
//
// Trade-off: anything that actually exercises reanimated semantics (worklets,
// shared-value updates, animations) will silently no-op. Test assertions that
// depend on real reanimated behaviour will fail — that is intentional for the
// time being; we just want the infra to not crash.

import { Image, ScrollView, Text, View } from 'react-native';

// ---------------------------------------------------------------------------
// Types (purely erased at runtime; precise shapes don't matter for the stub).
// ---------------------------------------------------------------------------

export type SharedValue<T> = {
  value: T;
  addListener?: (id: number, listener: (value: T) => void) => void;
  removeListener?: (id: number) => void;
  modify?: (modifier: (value: T) => T, forceUpdate?: boolean) => void;
};

export type AnimatableValue = number | string | Array<number | string>;
export type AnimatableValueObject = Record<string, AnimatableValue>;
export type WithSpringConfig = Record<string, unknown>;
export type WithDecayConfig = Record<string, unknown>;
export type WithTimingConfig = Record<string, unknown>;
export type StyleProps = Record<string, unknown>;
export type AnimatedStyle<T = unknown> = T;
export type LayoutAnimationStartFunction = (...args: unknown[]) => unknown;
export type LayoutAnimationsValues = Record<string, unknown>;
export type ComponentCoords = { x: number; y: number };
export type AnimationCallback = (finished?: boolean, currentValue?: unknown) => void;

// ---------------------------------------------------------------------------
// Hooks / shared values.
// ---------------------------------------------------------------------------

function makeStub<T>(initialValue: T): SharedValue<T> {
  let current = initialValue;
  return {
    get value() {
      return current;
    },
    set value(next: T) {
      current = next;
    },
    addListener: () => {},
    removeListener: () => {},
    modify: (modifier, _forceUpdate) => {
      current = modifier(current);
    },
  };
}

export function makeMutable<T>(initialValue: T): SharedValue<T> {
  return makeStub(initialValue);
}

export function useSharedValue<T>(initialValue: T): SharedValue<T> {
  return makeStub(initialValue);
}

export function useDerivedValue<T>(updater: () => T): SharedValue<T> {
  return makeStub(updater());
}

export function useAnimatedStyle<T>(updater: () => T): T {
  return updater();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAnimatedRef<T = any>(): { current: T | null } {
  return { current: null };
}

export function useFrameCallback(
  _callback: (frameInfo: { timeSinceFirstFrame: number; timeSincePreviousFrame: number | null; frameCount: number }) => void,
  _autostart?: boolean
) {
  return {
    setActive: (_active: boolean) => {},
    isActive: false,
  };
}

// ---------------------------------------------------------------------------
// Animation builders. They just return the target value synchronously.
// ---------------------------------------------------------------------------

export const withTiming = <T,>(
  toValue: T,
  _config?: WithTimingConfig,
  callback?: AnimationCallback
): T => {
  callback?.(true, toValue);
  return toValue;
};

export const withSpring = <T,>(
  toValue: T,
  _config?: WithSpringConfig,
  callback?: AnimationCallback
): T => {
  callback?.(true, toValue);
  return toValue;
};

export const withDecay = <T,>(
  _config?: WithDecayConfig,
  callback?: AnimationCallback
): T => {
  callback?.(true);
  return undefined as unknown as T;
};

export const withSequence = <T,>(...steps: T[]): T => steps[steps.length - 1];

export const withDelay = <T,>(_delay: number, value: T): T => value;

export function cancelAnimation(_sharedValue: unknown) {}

// ---------------------------------------------------------------------------
// Easing — every member is an identity function so test code that calls
// `Easing.linear`, `Easing.bezier(...)`, etc. won't throw.
// ---------------------------------------------------------------------------

const easingFn = (x: number) => x;
const easingFactory = (..._args: unknown[]) => easingFn;
export const Easing: Record<string, typeof easingFn | typeof easingFactory> = new Proxy(
  {},
  {
    get: (_target, _prop) => {
      // Could be a plain easing function (Easing.linear) or a factory
      // (Easing.bezier(...) → returns a function). Return a value that works
      // for both shapes by being callable AND providing the identity result.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((..._args: unknown[]) => easingFn) as any;
    },
  }
);

// ---------------------------------------------------------------------------
// Keyframe / layout animations.
// ---------------------------------------------------------------------------

export class Keyframe {
  constructor(public definition?: unknown) {}
  duration(_d: number) {
    return this;
  }
  delay(_d: number) {
    return this;
  }
  reverse() {
    return this;
  }
  withCallback(_cb: unknown) {
    return this;
  }
}

const layoutBuilderProxy = new Proxy(
  {},
  {
    get: () => layoutBuilderProxy,
    apply: () => layoutBuilderProxy,
  }
);

// Reanimated has lots of these (FadeIn, FadeOut, SlideInLeft, ...). The proxy
// chain works for the common .duration().delay().build() patterns.
export const FadeIn = layoutBuilderProxy;
export const FadeOut = layoutBuilderProxy;
export const SlideInLeft = layoutBuilderProxy;
export const SlideOutRight = layoutBuilderProxy;
export const LinearTransition = layoutBuilderProxy;
export const FadeInLeft = layoutBuilderProxy;
export const FadeInRight = layoutBuilderProxy;
export const FadeInUp = layoutBuilderProxy;
export const FadeInDown = layoutBuilderProxy;

// ---------------------------------------------------------------------------
// Color / native helpers.
// ---------------------------------------------------------------------------

export function isColor(_value: unknown): boolean {
  return false;
}

export function processColor(_value: unknown): number | null {
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getViewProp(..._args: unknown[]): any {
  return undefined;
}

export function getStaticFeatureFlag(_name: string): boolean {
  return false;
}

// ---------------------------------------------------------------------------
// Animated default export. Components are just their plain RN counterparts.
// `createAnimatedComponent` is the identity.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Animated: Record<string, any> = {
  View,
  Text,
  Image,
  ScrollView,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createAnimatedComponent: <C,>(component: C): C => component,
};

export default Animated;
