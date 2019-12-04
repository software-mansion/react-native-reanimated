import React, { useMemo, useRef, useState } from 'react';
import { findNodeHandle, Image, StyleSheet, Platform, processColor } from 'react-native';
import { PanGestureHandler, State, RectButton } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

const { intercept, divide, debug, map, block, cond, eq, add, max, set, Text, Value, event, decay, invoke, dispatch, useCode, neq, createAnimatedComponent, View, ScrollView, proc, Clock, multiply, not, clockRunning, startClock, stopClock } = Animated;

const orientationMap = proc((width, height, scale) => {
  return map({
    windowPhysicalPixels: { width, height, scale }
  });
});


export default function OrientationChange() {

  const width = useMemo(() => new Value(0), []);
  const height = useMemo(() => new Value(0), []);
  const scale = useMemo(() => new Value(1), []);
  useCode(() =>
    block([
      intercept('didUpdateDimensions', orientationMap(width, height, scale)),
      set(width, divide(width, scale)),
      set(height, divide(height, scale)),
      debug('width', width),
      debug('height', height),
      debug('scale', scale),
    ]),
    [width, height, scale]
  );

  return null;
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    borderColor: 'blue',
    borderWidth: 2,
    margin: 5
  },
  default: {
    flex: 1
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    alignSelf: 'center',
    color: 'black',
    backgroundColor: 'white'
  }
})
