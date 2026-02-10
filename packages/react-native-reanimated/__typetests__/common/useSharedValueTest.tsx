/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef } from 'react';
import { Button } from 'react-native';

import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from '../..';

function UseSharedValueTestRead() {
  const sv = useSharedValue(0);
  const ref = useRef(0);

  useEffect(() => {
    ref.current = sv.value;
    ref.current = sv.get();
  }, [sv]);
  return null;
}

function UseSharedValueTestWrite() {
  const sv = useSharedValue(0);
  const ref = useRef(0);

  useEffect(() => {
    sv.value = ref.current;
    sv.set(ref.current);
  }, [sv]);
  return null;
}

function UseSharedValueTestIncrement() {
  const sv = useSharedValue(0);
  const ref = useRef(0);

  useEffect(() => {
    sv.value += ref.current;
    sv.set(sv.value + ref.current);
    sv.set((value) => value + ref.current);
  }, [sv]);
  return null;
}

function UseSharedValueTestDecrement() {
  const sv = useSharedValue(0);
  const ref = useRef(0);

  useEffect(() => {
    sv.value -= ref.current;
    sv.set(sv.value - ref.current);
    sv.set((value) => value - ref.current);
  }, [sv]);
  return null;
}

function UseSharedValueTestMultiply() {
  const sv = useSharedValue(0);
  const ref = useRef(0);

  useEffect(() => {
    sv.value *= ref.current;
    sv.set(sv.value * ref.current);
    sv.set((value) => value * ref.current);
  }, [sv]);
  return null;
}

function UseSharedValueTestDivide() {
  const sv = useSharedValue(0);
  const ref = useRef(0);

  useEffect(() => {
    sv.value /= ref.current;
    sv.set(sv.value / ref.current);
    sv.set((value) => value / ref.current);
  }, [sv]);
  return null;
}

function UseSharedValueTestRemainder() {
  const sv = useSharedValue(0);
  const ref = useRef(0);

  useEffect(() => {
    sv.value %= ref.current;
    sv.set(sv.value % ref.current);
    sv.set((value) => value % ref.current);
  }, [sv]);
  return null;
}

function UseSharedValueTestPower() {
  const sv = useSharedValue(0);
  const ref = useRef(0);

  useEffect(() => {
    sv.value **= ref.current;
    sv.set(sv.value ** ref.current);
    sv.set((value) => value ** ref.current);
  }, [sv]);
  return null;
}

function UseSharedValueTestAnimation() {
  const sv = useSharedValue(0);

  useEffect(() => {
    withTiming(sv.value);
    withTiming(sv.get());
  }, [sv]);
  return null;
}

function UseSharedValueTestUseAnimatedStyle() {
  const sv = useSharedValue(0);

  const animatedStyle1 = useAnimatedStyle(() => ({
    width: sv.value,
    height: sv.value,
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    width: sv.get(),
    height: sv.get(),
  }));

  return <Animated.View style={[animatedStyle1, animatedStyle2]} />;
}

function UseSharedValueTestModify() {
  const sv = useSharedValue<number[]>([1, 2, 3]);

  sv.modify((value) => {
    'worklet';
    return value;
  });
}
