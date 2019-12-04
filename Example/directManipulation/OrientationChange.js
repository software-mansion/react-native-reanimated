import React, { useMemo, useRef, useState } from 'react';
import { findNodeHandle, StyleSheet, Platform, processColor, Dimensions, useWindowDimensions } from 'react-native';
import { PanGestureHandler, State, RectButton } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

const { intercept, divide, debug, map, block, Image, cond, eq, add, max, set, Text, Value, event, decay, invoke, dispatch, useCode, neq, createAnimatedComponent, View, ScrollView, proc, Clock, multiply, not, clockRunning, startClock, stopClock } = Animated;

const orientationMap = proc((width, height, scale) => {
  return map({
    windowPhysicalPixels: { width, height, scale }
  });
});

const div = 2;

export default function OrientationChange() {
  const width = useMemo(() => new Value(Dimensions.get('window').width), []);
  const height = useMemo(() => new Value(Dimensions.get('window').height), []);
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

  //const window = useWindowDimensions();

  /*
  <View
        style={[{ width: window.width / 4, height: window.height / 4 }, styles.view]}
        collapsable={false}
      />
      */

  return (
    <View style={styles.container}>
      <View
        style={[{ width: divide(width, div), height: divide(height, div) }, styles.view]}
        collapsable={false}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  view: {
    backgroundColor: 'red',
    //margin: 20
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'pink'
  },
})
