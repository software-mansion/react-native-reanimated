import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';

import Animated, { Easing } from 'react-native-reanimated';

const {
  divide,
  greaterThan,
  set,
  cond,
  startClock,
  stopClock,
  clockRunning,
  block,
  spring,
  add,
  debug,
  Value,
  Clock,
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
    damping: 10,
    mass: 5,
    stiffness: 101.6,
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

export default class Example extends Component {
  constructor(props) {
    super(props);
    const clock = new Clock();
    this._trans = runSpring(clock, 10, 150);
  }
  componentDidMount() {}
  render() {
    return (
      <Animated.View
        style={[styles.container, { borderWidth: divide(this._trans, 5) }]}>
        <Animated.Text
          style={[
            styles.box,
            {
              width: this._trans,
              height: this._trans,
            },
          ]}>
          sample text is getting bigger and bigger more and moar staph staph
          stophhh
        </Animated.Text>
        <Animated.Text
          style={[
            styles.text,
            {
              fontSize: add(divide(this._trans, 10), 15),
              letterSpacing: add(divide(this._trans, -15), 10),
              fontStyle: cond(
                greaterThan(this._trans, 190),
                'normal',
                'italic'
              ),
            },
          ]}>
          aesthetic
        </Animated.Text>
        <Animated.View style={[styles.box, { top: this._trans }]} />
      </Animated.View>
    );
  }
}

const BOX_SIZE = 100;

const styles = StyleSheet.create({
  text: {
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#fb628c',
    backgroundColor: '#2e13ff',
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderColor: '#f900ff',
    alignSelf: 'center',
    backgroundColor: '#19ff75',
    margin: BOX_SIZE / 2,
  },
});
