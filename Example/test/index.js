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
  timing,
  debug,
  spring,
  Value,
  Clock,
  event,
  param,
  proc,
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
    const a = param("a");
    const b = param("b");
    const calc = proc(add(multiply(a, b), 333), a, b);
    this._first = calc(10, 10);
    this._second = calc(20, 20);
    this._third = calc(this._first, this._second);
    this._fourth = calc(this._third, 2);
    
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
  render() {
    return (
      <View style={styles.container}>
        <Animated.Code>
          { ()=> 
            call([this._first, this._second, this._third, this._fourth], ([first, second, third, fourth]) => {
              console.log(first, second, third, fourth);
            })
          }
        </Animated.Code>
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

let nodeCallCount = 0
const spyFunction = (data) => {
  const m = data.method;
  if (
    m
      .toString()
      .toLowerCase()
      .includes("node") &&
    !m.toString().includes("createAnimatedNode")
  ) {
    if (data.args.length === 2 && data.args[1].hasOwnProperty("type")) {
      console.log(nodeCallCount++, m, data.args[1].type);
      nodeCallCount.current++;
    } else {
      //console.log(m);
    }
  }
};
MessageQueue.spy(spyFunction);

