import { useRef } from 'react';
import { describe, test } from 'tstyche';

import { useAnimatedStyle, useSharedValue, withTiming } from '..';

describe('useSharedValue', () => {
  test('reads via .value and .get()', () => {
    const sv = useSharedValue(0);
    const ref = useRef(0);
    ref.current = sv.value;
    ref.current = sv.get();
  });

  test('writes via .value and .set()', () => {
    const sv = useSharedValue(0);
    const ref = useRef(0);
    sv.value = ref.current;
    sv.set(ref.current);
  });

  test('supports compound assignment and functional set', () => {
    const sv = useSharedValue(0);
    const ref = useRef(0);
    sv.value += ref.current;
    sv.value -= ref.current;
    sv.value *= ref.current;
    sv.value /= ref.current;
    sv.value %= ref.current;
    sv.value **= ref.current;
    sv.set((value) => value + ref.current);
  });

  test('is usable with withTiming', () => {
    const sv = useSharedValue(0);
    withTiming(sv.value);
    withTiming(sv.get());
  });

  test('is usable inside useAnimatedStyle', () => {
    const sv = useSharedValue(0);
    useAnimatedStyle(() => ({ width: sv.value, height: sv.value }));
    useAnimatedStyle(() => ({ width: sv.get(), height: sv.get() }));
  });

  test('modify receives and returns the value', () => {
    const sv = useSharedValue<number[]>([1, 2, 3]);
    sv.modify((value) => {
      'worklet';
      return value;
    });
  });
});
