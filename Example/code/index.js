import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';

import Animated, { Easing } from 'react-native-reanimated';

const {
  set,
  cond,
  eq,
  add,
  call,
  multiply,
  lessThan,
  startClock,
  stopClock,
  clockRunning,
  block,
  pow,
  timing,
  debug,
  spring,
  sub,
  Value,
  Clock,
  event,
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

    // const transX = new Value(0);
    const clock = new Clock();
    // const twenty = new Value(20);
    // const thirty = new Value(30);
    // this._transX = cond(new Value(0), twenty, multiply(3, thirty));
    this._transX = runTiming(clock, -120, 120);
  }
  componentDidMount() {
    // Animated.spring(this._transX, {
    //   duration: 300,
    //   velocity: -300,
    //   toValue: 150,
    // }).start();
  }
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
