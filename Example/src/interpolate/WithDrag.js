import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing } from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Box from '../Box';
import Row from '../Row';

const {
  set,
  cond,
  sub,
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
  defined,
} = Animated;

function runSpring(clock, value, velocity, dest) {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  };

  const config = {
    damping: 7,
    mass: 1,
    stiffness: 121.6,
    overshootClamping: false,
    restSpeedThreshold: 0.001,
    restDisplacementThreshold: 0.001,
    toValue: new Value(0),
  };

  return [
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.velocity, velocity),
      set(state.position, value),
      set(config.toValue, dest),
      startClock(clock),
    ]),
    cond(state.finished, stopClock(clock)),
    state.position,
  ];
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
  ];

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

export default class WithDrag extends Component {
  constructor(props) {
    super(props);
    const TOSS_SEC = 0.2;

    const dragX = new Value(0);
    const state = new Value(-1);
    const dragVX = new Value(0);
    const transX = new Value();
    const prevDragX = new Value(0);
    const clock = new Clock();

    this._onGestureEvent = event([
      { nativeEvent: { translationX: dragX, velocityX: dragVX, state: state } },
    ]);

    const snapPoint = cond(
      lessThan(add(transX, multiply(TOSS_SEC, dragVX)), 0),
      -100,
      100
    );

    this._transX = cond(
      eq(state, State.ACTIVE),
      [
        stopClock(clock),
        set(transX, add(transX, sub(dragX, prevDragX))),
        set(prevDragX, dragX),
        transX,
      ],
      [
        set(prevDragX, 0),
        set(
          transX,
          cond(defined(transX), runSpring(clock, transX, dragVX, snapPoint), 0)
        ),
      ]
    );

    this._transXA = interpolate(this._transX, {
      inputRange: [-120, 120],
      outputRange: [-100, 100],
    });
    this._transXB = interpolate(this._transX, {
      inputRange: [-120, -60, 60, 120],
      outputRange: [-60, -10, 10, 60],
    });
  }
  render() {
    return (
      <View style={styles.container}>
        <Row>
          <PanGestureHandler
            maxPointers={1}
            onGestureEvent={this._onGestureEvent}
            onHandlerStateChange={this._onGestureEvent}>
            <Box style={{ transform: [{ translateX: this._transX }] }} />
          </PanGestureHandler>
        </Row>
        <Row>
          <Box style={{ transform: [{ translateX: this._transXA }] }} />
        </Row>
        <Row>
          <Box style={{ transform: [{ translateX: this._transXB }] }} />
        </Row>
      </View>
    );
  }
}

const BOX_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
