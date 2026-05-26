/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Type tests verifying that the `Animation<XxxAnimation<V>>` return type of
 * each builder is _structurally_ an `AnimationObject<V>` — so a downstream
 * consumer using `T extends AnimationObject<infer V>` recovers the underlying
 * value type rather than the animation type. This is the property that lets
 * `useDerivedValue(() => withTiming(100))` infer `DerivedValue<number>`.
 */
import type { Animation, AnimationObject } from '..';
import {
  withClamp,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from '..';

type ValueOf<TMaybeAnimation> =
  TMaybeAnimation extends AnimationObject<infer TValue> ? TValue : never;

function ExtractFromWithTiming() {
  const target: number = 100;
  const a = withTiming(target);
  const v: ValueOf<typeof a> = 0;
}

function ExtractFromWithSpring() {
  const target: number = 100;
  const a = withSpring(target);
  const v: ValueOf<typeof a> = 0;
}

function ExtractFromWithDelay() {
  const target: number = 100;
  const a = withDelay(50, withTiming(target));
  const v: ValueOf<typeof a> = 0;
}

function ExtractFromWithSequence() {
  const target: number = 100;
  const a = withSequence(withTiming(0), withTiming(target));
  const v: ValueOf<typeof a> = 0;
}

function ExtractFromWithRepeat() {
  const target: number = 100;
  const a = withRepeat(withTiming(target), 3, true);
  const v: ValueOf<typeof a> = 0;
}

function ExtractFromWithClamp() {
  const target: number = 100;
  const a = withClamp({ min: 0, max: 200 }, withSpring(target));
  const v: ValueOf<typeof a> = 0;
}

function AnimationStructurallyIsAnimationObject() {
  const target: number = 100;
  const t: AnimationObject<number> = withTiming(target);
  const s: AnimationObject<number> = withSpring(target);
}
