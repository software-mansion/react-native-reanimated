import React, { Component } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Animated, { Easing } from 'react-native-reanimated';

const {
  set,
  cond,
  sub,
  pow,
  add,
  multiply,
  startClock,
  stopClock,
  debug,
  sqrt,
  sin,
  cos,
  clockRunning,
  block,
  timing,
  Value,
  Clock,
  proc,
} = Animated;

function runTiming(clock, value, dest, time) {
  const state = {
    finished: new Value(0),
    position: new Value(0),
    time: new Value(0),
    frameTime: new Value(0),
  };

  const config = {
    duration: time,
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
    const trans = runTiming(new Clock(), new Value(0), 120, 5000);
    const xCircle = proc((progress, speed, radius) =>
      multiply(add(sin(multiply(progress, speed)), 1), radius)
    );
    const yCircle = proc((progress, speed, radius) =>
      multiply(add(cos(multiply(progress, speed)), 1), radius)
    );
    const asCircle = (progress, speed, radius) => [
      xCircle(progress, speed, radius),
      yCircle(progress, speed, radius),
    ];
    const [XA, YA] = asCircle(trans, 2, 10);
    this.XA = XA;
    this.YA = YA;
    const [XB, YB] = asCircle(trans, 1.2, 20);
    this.XB = XB;
    this.YB = YB;
    const [XC, YC] = asCircle(trans, 0.3, 40);
    this.XC = XC;
    this.YC = YC;
  }
  render() {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Animated.View
          style={[
            styles.box,
            {
              transform: [
                {
                  translateX: this.XA,
                  translateY: this.YA,
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.box,
            {
              transform: [
                {
                  translateX: this.XB,
                  translateY: this.YB,
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.box,
            {
              transform: [
                {
                  translateX: this.XC,
                  translateY: this.YC,
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.box,
            {
              transform: [
                {
                  translateX: add(this.XC, this.XB, this.XC),
                  translateY: add(this.YC, this.YB, this.Y),
                },
              ],
            },
          ]}
        />
      </ScrollView>
    );
  }
}

const BOX_SIZE = 20;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderColor: '#F5FCFF',
    backgroundColor: 'plum',
    margin: BOX_SIZE / 2,
    borderRadius: BOX_SIZE / 2,
  },
});
