/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Type tests verifying that animation builders can be assigned to a shared
 * value's `.value` (and passed to `.set()`) — the runtime resolves the
 * animation and stores the underlying value, and the static types now reflect
 * that.
 */
import { useEffect } from 'react';

import {
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from '..';

function AssignAnimationToValue() {
  const sv = useSharedValue(0);
  useEffect(() => {
    sv.value = withTiming(100);
    sv.value = withSpring(50);
    sv.value = withSequence(withTiming(0), withTiming(100));
    sv.value = withDelay(100, withTiming(50));
    sv.value = withRepeat(withTiming(50), 3, true);
  }, [sv]);
}

function AssignAnimationViaSet() {
  const sv = useSharedValue(0);
  useEffect(() => {
    sv.set(withTiming(100));
    sv.set(withSpring(50));
    sv.set(withSequence(withTiming(0), withTiming(100)));
    sv.set(withDelay(100, withTiming(50)));
    sv.set(withRepeat(withTiming(50), 3, true));
  }, [sv]);
}

function AssignStringAnimation() {
  const sv = useSharedValue<string>('red');
  useEffect(() => {
    sv.value = withTiming('blue');
    sv.set(withTiming('rgba(0,0,0,1)'));
  }, [sv]);
}

function UpdaterFormStillWorks() {
  const sv = useSharedValue(0);
  useEffect(() => {
    // Plain updater form (no animation) must still typecheck.
    sv.set((prev) => prev + 1);
    sv.set((prev) => prev * 2);
  }, [sv]);
}

function ReadBackIsRawValueType() {
  const sv = useSharedValue<number>(0);
  sv.value = withTiming(100);
  // Reading `.value` returns the raw `number`, never the animation object.
  const v: number = sv.value;
  const g: number = sv.get();
}
