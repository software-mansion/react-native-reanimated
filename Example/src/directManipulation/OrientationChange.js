import React, { useMemo, useEffect, useState } from 'react';
import { findNodeHandle, StyleSheet, Platform, processColor, Dimensions } from 'react-native';
import { PanGestureHandler, State, RectButton } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

const { intercept, divide, debug, map, block, Image, cond, eq, add, max, set, Text, Value, event, decay, invoke, dispatch, useCode, neq, createAnimatedComponent, View, ScrollView, proc, Clock, multiply, not, clockRunning, startClock, stopClock } = Animated;

const orientationMap = proc((width, height, scale) => {
  return map({
    windowPhysicalPixels: { width, height, scale }
  });
});

const orientationListener = proc((width, height, scale) => intercept('didUpdateDimensions', orientationMap(width, height, scale)));

const rotation = new Value(0);
const interceptRotation = intercept('namedOrientationDidChange', {
  rotationDegrees: rotation
});

const div = 3;

function useDimensions() {
  const [window, setDims] = useState(Dimensions.get('window'));
  useEffect(() => {
    const l = ({ window }) => setDims(window);
    Dimensions.addEventListener('change', l);
    return () => Dimensions.removeEventListener('change', l);
  }, []);

  return window;
}

function useAnimatedDimensions() {
  const width = useMemo(() => new Value(Dimensions.get('window').width), []);
  const height = useMemo(() => new Value(Dimensions.get('window').height), []);
  const scale = useMemo(() => new Value(1), []);

  useCode(() =>
    block([
      //intercept('didUpdateDimensions', orientationMap(width, height, scale)),
      orientationListener(width, height, scale),
      set(width, divide(width, scale)),
      set(height, divide(height, scale)),
      debug('width', width),
      debug('height', height),
      debug('scale', scale),

    ]),
    [width, height, scale]
  );

  useCode(() =>
    block([
      interceptRotation,
      debug('rotation', rotation)
    ]),
    [interceptRotation, rotation]
  );

  return { width, height };
}

function StateOrientation() {
  const { width, height } = useDimensions();
  return (
    <View
      style={[{ width: width / div, height: height / div }, styles.view]}
      collapsable={false}
    />
  );
}

export default function OrientationChange() {
  const { width, height } = useAnimatedDimensions();
  return (
    <View style={styles.container}>
      <View
        style={[{ width: divide(width, div), height: divide(height, div) }, styles.view]}
        collapsable={false}
      />
      <StateOrientation />
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
