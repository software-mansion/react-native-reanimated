/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Type tests for the exported `ReanimatedValue<T>` helper — the union that
 * covers everything assignable to a shared value's `.value` (plain value,
 * animation object, or animation factory).
 */
import { useEffect } from 'react';

import type { ReanimatedValue } from '..';
import {
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from '..';

function ReanimatedValueAcceptsRawValue() {
  const v: ReanimatedValue<number> = 42;
  const s: ReanimatedValue<string> = 'red';
}

function ReanimatedValueAcceptsAnimationObject() {
  const a: ReanimatedValue<number> = withTiming(100);
  const b: ReanimatedValue<number> = withSpring(50);
  const c: ReanimatedValue<number> = withSequence(
    withTiming(0),
    withTiming(50)
  );
  const d: ReanimatedValue<string> = withTiming('blue');
}

function ReanimatedValueAcceptsAnimationFactory() {
  const f: ReanimatedValue<number> = () => withTiming(100);
  const g: ReanimatedValue<number> = () => withSpring(50);
}

function CustomHelperUsingReanimatedValue() {
  function setLater(sv: { value: ReanimatedValue<number> }, next: number) {
    sv.value = withTiming(next);
  }
  function setLaterRaw(sv: { value: ReanimatedValue<number> }, next: number) {
    sv.value = next;
  }
  function setLaterFactory(sv: { value: ReanimatedValue<number> }) {
    sv.value = () => withDelay(100, withTiming(0));
  }
}
