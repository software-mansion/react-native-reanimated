import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';

import Animated, { Easing } from 'react-native-reanimated';

const {
  set,
  cond,
  add,
  multiply,
  startClock,
  stopClock,
  clockRunning,
  block,
  timing,
  debug,
  sub,
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
    this._transX = runTiming(clock, -120, 120);
  }
  componentDidMount() {}
  transX1 = new Animated.Value(0);
  transX2 = new Animated.Value(0);
  transX3 = new Animated.Value(0);
  transX4 = new Animated.Value(0);

  render() {
    return (
      <View style={styles.container}>
        <Animated.Code>
          {() =>
            block([
              set(this.transX1, add(multiply(-1, this._transX))),
              set(this.transX2, add(multiply(-2, this._transX), 120)),
              set(this.transX3, sub(multiply(2, this._transX), 120)),
              set(this.transX4, add(multiply(1, this._transX))),
            ])
          }
        </Animated.Code>
        <Animated.View
          style={[styles.box, { transform: [{ translateX: this.transX1 }] }]}
        />
        <Animated.View
          style={[styles.box, { transform: [{ translateX: this.transX2 }] }]}
        />
        <Animated.View
          style={[styles.box, { transform: [{ translateX: this.transX3 }] }]}
        />
        <Animated.View
          style={[styles.box, { transform: [{ translateX: this.transX4 }] }]}
        />
      </View>
    );
  }
}

const BOX_SIZE = 50;

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
