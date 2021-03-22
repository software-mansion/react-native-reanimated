import React, { Component } from 'react';
import Animated, { Easing } from 'react-native-reanimated';
import Box from '../Box';
import Row from '../Row';

const {
  set,
  cond,
  eq,
  and,
  startClock,
  clockRunning,
  block,
  timing,
  Value,
  Clock,
  interpolate,
} = Animated;

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

export default class Basic extends Component {
  constructor(props) {
    super(props);
    const clock = new Clock();
    const base = runTiming(clock, -1, 1);
    this._transX = interpolate(base, {
      inputRange: [-1, 1],
      outputRange: [-100, 100],
    });
    this._rotateZ = interpolateNode(base, {
      inputRange: [-1, 1],
      outputRange: ['0rad', `${Math.PI}rad`],
    });
  }

  render() {
    return (
      <Row>
        <Box
          style={{
            transform: [
              { translateX: this._transX },
              { rotateZ: this._rotateZ },
            ],
          }}
        />
      </Row>
    );
  }
}
