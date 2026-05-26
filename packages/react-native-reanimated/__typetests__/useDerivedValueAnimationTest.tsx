/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Type tests for `useDerivedValue` returning animation builders. The hook
 * should infer the underlying value type (e.g. `number`), not the animation
 * object type, so the returned `DerivedValue` exposes `.value: number`.
 */
import { useEffect, useRef } from 'react';

import type { DerivedValue } from '..';
import { useDerivedValue, useSharedValue, withSpring, withTiming } from '..';

function InfersNumberFromWithTiming() {
  const sv = useSharedValue(0);
  const derived = useDerivedValue(() => withTiming(sv.value));
  // Should be DerivedValue<number>, not DerivedValue<Animation<...>>.
  const r: number = derived.value;
  const ref: DerivedValue<number> = derived;
}

function InfersStringFromWithTiming() {
  const target: string = 'rgba(0,0,0,1)';
  const derived = useDerivedValue(() => withTiming(target));
  const r: string = derived.value;
  const ref: DerivedValue<string> = derived;
}

function InfersNumberFromWithSpring() {
  const target: number = 100;
  const derived = useDerivedValue(() => withSpring(target));
  const r: number = derived.value;
  const ref: DerivedValue<number> = derived;
}

function ExplicitTypeStillWorks() {
  // Users who write `<number>` explicitly should keep working — the updater
  // returning an animation that animates a number is accepted.
  const derived = useDerivedValue<number>(() => withTiming(100));
  const r: number = derived.value;
}

function PlainValueReturnStillWorks() {
  const sv = useSharedValue(0);
  const derived = useDerivedValue(() => sv.value * 2);
  const r: number = derived.value;
}

function DerivedValueIsReadonly() {
  const derived = useDerivedValue(() => withTiming(100));
  // @ts-expect-error DerivedValue.value is readonly
  derived.value = 50;
}
