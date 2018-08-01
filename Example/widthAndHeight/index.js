import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';

import Animated, { Easing } from 'react-native-reanimated';

const {
  set,
  cond,
  startClock,
  stopClock,
  clockRunning,
  block,
  timing,
  debug,
  Value,
  Clock,
} = Animated;

function runTiming(clock, value, dest) {
  const state = {
    finished: new Value(0),
    position: new Value(0),
    time: new Value(0),
    frameTime: new Value(0),
  };

  const config = {
    duration: 5000,
    toValue: new Value(0),
    easing: Easing.inOut(Easing.ease),
  };

  return block([
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.time, 0),
      set(state.position, value),
      set(state.frameTime, 0),
      set(config.toValue, dest),
      startClock(clock),
    ]),
    timing(clock, state, config),
    cond(state.finished, debug('stop clock', stopClock(clock))),
    state.position,
  ]);
}

export default class Example extends Component {
  constructor(props) {
    super(props);
    const clock = new Clock();
    this._trans = runTiming(clock, 10, 150);
  }
  componentDidMount() {}
  render() {
    return (
      <View style={styles.container}>
        <Animated.Text
          style={[styles.box, { width: this._trans, height: this._trans }]}>
          sample text is getting bigger and bigger more and moar staph staph
          stophhh
        </Animated.Text>
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
