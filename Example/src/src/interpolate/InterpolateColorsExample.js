import React, {Component} from 'react';
import Animated, {Easing} from 'react-native-reanimated';
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
  interpolateColors,
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

export default class InterpolateColorsExample extends Component {
  constructor(props) {
    super(props);
    const clock = new Clock();
    const base = runTiming(clock, -1, 1);
    this.color = interpolateColors(base, {
      inputRange: [-1, 1],
      outputColorRange: ['blue', 'rgba(255, 0, 0, 0.5)'],
    });
  }

  render() {
    return (
      <Row>
        <Box style={{backgroundColor: this.color}} />
      </Row>
    );
  }
}
