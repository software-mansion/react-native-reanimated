import React, { Component } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

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
  ReusableNode,
  spring,
  Value,
  Clock,
  event,
  ProceduralNode,
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
    this.reverse = new ProceduralNode(x => multiply(x, -1));
    this.add50 = new ProceduralNode(x => add(x, 50));
    this.transX = runTiming(new Clock(), new Value(0), 120, 5000);
  }
  render() {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text> timing to 120 </Text>
        <Animated.View
          style={[
            styles.box,
            {
              transform: [{ translateX: this.transX }],
            },
          ]}
        />
        <Text> timing and add 50 </Text>
        <Animated.View
          style={[
            styles.box,
            {
              transform: [{ translateX: this.add50.invoke(this.transX) }],
            },
          ]}
        />
        <Text> timing and reverse </Text>
        <Animated.View
          style={[
            styles.box,
            {
              transform: [{ translateX: this.reverse.invoke(this.transX) }],
            },
          ]}
        />
        <Text> timing, reverse and add 50 </Text>
        <Animated.View
          style={[
            styles.box,
            {
              transform: [
                {
                  translateX: this.add50.invoke(
                    this.reverse.invoke(this.transX)
                  ),
                },
              ],
            },
          ]}
        />
        <Text> timing, add 50 and reverse </Text>
        <Animated.View
          style={[
            styles.box,
            {
              transform: [
                {
                  translateX: this.reverse.invoke(
                    this.add50.invoke(this.transX)
                  ),
                },
              ],
            },
          ]}
        />
        <Text> timing, reverse, add 50 and reverse </Text>
        <Animated.View
          style={[
            styles.box,
            {
              transform: [
                {
                  translateX: this.reverse.invoke(
                    this.add50.invoke(this.reverse.invoke(this.transX))
                  ),
                },
              ],
            },
          ]}
        />

        <Text> timing, reverse, add 50, reverse and add 50 (no-op) </Text>
        <Animated.View
          style={[
            styles.box,
            {
              transform: [
                {
                  translateX: this.add50.invoke(
                    this.reverse.invoke(
                      this.add50.invoke(this.reverse.invoke(this.transX))
                    )
                  ),
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
