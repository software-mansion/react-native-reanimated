/* eslint-disable @typescript-eslint/unbound-method -- type-testing methods requires referencing them unbound */
import { useRef } from 'react';
import { describe, expect, test } from 'tstyche';

import type { SharedValue } from '..';
import { useAnimatedStyle, useSharedValue, withTiming } from '..';

describe('useSharedValue', () => {
  test('infers a SharedValue of the initial value type', () => {
    expect(useSharedValue(0)).type.toBe<SharedValue<number>>();
    expect(useSharedValue<number[]>([1, 2, 3])).type.toBe<
      SharedValue<number[]>
    >();
  });

  test('.value and .get() are typed as the value', () => {
    const sv = useSharedValue(0);
    expect(sv.value).type.toBe<number>();
    expect(sv.get()).type.toBe<number>();
  });

  test('.value is writable, including compound assignment', () => {
    const sv = useSharedValue(0);
    const ref = useRef(0);
    sv.value = ref.current;
    sv.value += ref.current;
  });

  test('.set accepts a value or an updater', () => {
    const sv = useSharedValue(0);
    expect(sv.set).type.toBeCallableWith(0);
    expect(sv.set).type.toBeCallableWith((value: number) => value + 1);
  });

  test('.modify accepts a modifier returning the value', () => {
    const sv = useSharedValue<number[]>([1, 2, 3]);
    expect(sv.modify).type.toBeCallableWith((value: number[]) => value);
  });

  test('.value is usable as an animation and style value', () => {
    const sv = useSharedValue(0);
    expect(withTiming).type.toBeCallableWith(sv.value);
    expect(useAnimatedStyle).type.toBeCallableWith(() => ({
      width: sv.value,
      height: sv.get(),
    }));
  });
});
