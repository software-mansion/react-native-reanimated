import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

const {
  block,
  set,
  cond,
  eq,
  spring,
  startClock,
  Value,
  Clock,
  SpringUtils,
} = Animated;

function runSpring(clock, value, config) {
  const state = {
    finished: new Value(1),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  };

  return block([
    cond(state.finished, [
      set(state.finished, 0),
      set(state.position, value),
      set(config.toValue, cond(eq(config.toValue, 100), -100, 100)),
      startClock(clock),
    ]),
    spring(clock, state, config),
    state.position,
  ]);
}

class Snappable extends Component {
  constructor(props) {
    super(props);
    const transX = new Value();
    const clock = new Clock();
    this._transX = runSpring(clock, transX, props.config);
  }
  render() {
    const { children } = this.props;
    return (
      <Animated.View style={{ transform: [{ translateX: this._transX }] }}>
        {children}
      </Animated.View>
    );
  }
}

const configA = SpringUtils.makeDefaultConfig();
const configB = SpringUtils.makeConfigFromBouncinessAndSpeed({
  ...SpringUtils.makeDefaultConfig(),
  bounciness: 10,
  speed: 8,
});
const configC = SpringUtils.makeConfigFromOrigamiTensionAndFriction({
  ...SpringUtils.makeDefaultConfig(),
  tension: 10,
  friction: new Value(4),
});

export default class Example extends React.Component {
  render() {
    return (
      <View style={styles.container}>
        <Snappable config={configA}>
          <View style={styles.box} />
        </Snappable>
        <Snappable config={configB}>
          <View style={styles.box} />
        </Snappable>
        <Snappable config={configC}>
          <View style={styles.box} />
        </Snappable>
      </View>
    );
  }
}

const CIRCLE_SIZE = 70;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: 'tomato',
    marginLeft: -(CIRCLE_SIZE / 2),
    marginTop: -(CIRCLE_SIZE / 2),
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    margin: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderColor: '#000',
  },
});
