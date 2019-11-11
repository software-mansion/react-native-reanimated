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
  multiply,
  lessThan,
  startClock,
  stopClock,
  clockRunning,
  block,
  timing,
  Value,
  Clock,
  event,
  interpolate,
  defined,
  Extrapolate,
} = Animated;

const getAnimation = (min, max) => {
  const clock = new Clock();
  const state = {
    finished: new Value(1),
    position: new Value(min),
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
    cond(and(state.finished, eq(state.position, min)), [
      ...reset,
      set(config.toValue, max),
    ]),
    cond(and(state.finished, eq(state.position, max)), [
      ...reset,
      set(config.toValue, min),
    ]),
    cond(clockRunning(clock), 0, startClock(clock)),
    timing(clock, state, config),
    state.position,
  ]);
};

export default class AnimatedBounds extends Component {
  constructor(props) {
    super(props);
    const TOSS_SEC = 0.2;

    const dragX = new Value(0);
    const state = new Value(-1);
    const transX = new Value(0);
    const prevDragX = new Value(0);

    this._onGestureEvent = event([
      { nativeEvent: { translationX: dragX, state: state } },
    ]);

    this._transX = cond(
      eq(state, State.ACTIVE),
      [
        set(transX, add(transX, sub(dragX, prevDragX))),
        set(prevDragX, dragX),
        transX,
      ],
      [set(prevDragX, 0), transX]
    );

    this._transX = interpolate(this._transX, {
      inputRange: [-100, 100],
      outputRange: [-100, 100],
      extrapolate: Extrapolate.CLAMP,
    });

    const min = getAnimation(-100, -50);
    const max = getAnimation(100, 50);
    this._transXA = interpolate(this._transX, {
      inputRange: [-100, 100],
      outputRange: [min, max],
      extrapolate: Extrapolate.CLAMP,
    });
    this.min = min;
    this.max = max;
  }
  render() {
    return (
      <View style={styles.container}>
        <Row>
          <Animated.View
            style={[styles.line, { transform: [{ translateX: -100 }] }]}
          />
          <Animated.View
            style={[styles.line, { transform: [{ translateX: 100 }] }]}
          />
          <PanGestureHandler
            maxPointers={1}
            minDist={10}
            onGestureEvent={this._onGestureEvent}
            onHandlerStateChange={this._onGestureEvent}>
            <Box style={{ transform: [{ translateX: this._transX }] }} />
          </PanGestureHandler>
        </Row>
        <Row>
          <Animated.View
            style={[styles.line, { transform: [{ translateX: this.min }] }]}
          />
          <Animated.View
            style={[styles.line, { transform: [{ translateX: this.max }] }]}
          />
          <Box style={{ transform: [{ translateX: this._transXA }] }} />
        </Row>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'red',
    height: 64,
    width: 1,
  },
});
