import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';

import Animated, { Easing } from 'react-native-reanimated';

const {
  set,
  cond,
  eq,
  and,
  add,
  call,
  multiply,
  lessThan,
  startClock,
  stopClock,
  clockRunning,
  block,
  timing,
  debug,
  spring,
  Value,
  Clock,
  event,
  interpolate,
} = Animated;

function runSpring(clock, value, dest) {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  };

  const config = {
    toValue: new Value(0),
    damping: 7,
    mass: 1,
    stiffness: 121.6,
    overshootClamping: false,
    restSpeedThreshold: 0.001,
    restDisplacementThreshold: 0.001,
  };

  return block([
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.time, 0),
      set(state.position, value),
      set(state.velocity, -2500),
      set(config.toValue, dest),
      startClock(clock),
    ]),
    spring(clock, state, config),
    cond(state.finished, debug('stop clock', stopClock(clock))),
    state.position,
  ]);
}

function runTiming(clock, value, dest) {
  const state = {
    finished: new Value(1),
    position: new Value(value),
    time: new Value(0),
    frameTime: new Value(0),
  };

  const config = {
    duration: 500,
    toValue: new Value(0),
    easing: Easing.inOut(Easing.ease),
  };

  const reset = [
      set(state.finished, 0),
      set(state.time, 0),
      set(state.frameTime, 0),
  ]

  return block([
    cond(and(state.finished, eq(state.position, value)), [
        ...reset,
        set(config.toValue, dest),
    ]),
    cond(and(state.finished, eq(state.position, dest)), [
        ...reset,
        set(config.toValue, value),
    ]),
    cond(clockRunning(clock), 0, startClock(clock)),
    timing(clock, state, config),
    state.position,
  ]);
}

export default class Example extends Component {
  constructor(props) {
    super(props);
    const clock = new Clock();
    const base = runTiming(clock, -120, 120);
    this._transX = interpolate(base, [-120, -60, 60, 120], [-20, -1, 1, 20])
  }
  render() {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[styles.box, { transform: [{ translateX: this._transX }] }]}
        />
      </View>
    );
  }
}

const BOX_SIZE = 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderColor: '#F5FCFF',
    alignSelf: 'center',
    backgroundColor: 'plum',
    margin: BOX_SIZE / 2,
  },
});
