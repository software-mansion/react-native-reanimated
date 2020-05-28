import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

// setInterval(() => {
//   let iters = 1e8,
//     sum = 0;
//   while (iters-- > 0) sum += iters;
// }, 300);

const {
  set,
  cond,
  eq,
  add,
  multiply,
  lessThan,
  spring,
  startClock,
  stopClock,
  clockRunning,
  sub,
  defined,
  Value,
  Clock,
  event,
} = Animated;

function runSpring(clock, value, velocity, dest) {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  };

  const config = {
    damping: 7,
    mass: 1,
    stiffness: 121.6,
    overshootClamping: false,
    restSpeedThreshold: 0.001,
    restDisplacementThreshold: 0.001,
    toValue: new Value(0),
  };

  return [
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.velocity, velocity),
      set(state.position, value),
      set(config.toValue, dest),
      startClock(clock),
    ]),
    spring(clock, state, config),
    cond(state.finished, stopClock(clock)),
    state.position,
  ];
}

class Snappable extends Component {
  constructor(props) {
    super(props);

    const TOSS_SEC = 0.2;

    const dragX = new Value(0);
    const state = new Value(-1);
    const dragVX = new Value(0);

    this._onGestureEvent = event([
      { nativeEvent: { translationX: dragX, velocityX: dragVX, state: state } },
    ]);

    const transX = new Value();
    const prevDragX = new Value(0);

    const clock = new Clock();

    // If transX has not yet been defined we stay in the center (value is 0).
    // When transX is defined, it means drag has already occured. In such a case
    // we want to snap to -100 if the final position of the block is below 0
    // and to 100 otherwise.
    // We also take into account gesture velocity at the moment of release. To
    // do that we calculate final position of the block as if it was moving for
    // TOSS_SEC seconds with a constant speed the block had when released (dragVX).
    // So the formula for the final position is:
    //   finalX = transX + TOSS_SEC * dragVelocityX
    //
    const snapPoint = cond(
      lessThan(add(transX, multiply(TOSS_SEC, dragVX)), 0),
      -100,
      100
    );

    this._transX = cond(
      eq(state, State.ACTIVE),
      [
        stopClock(clock),
        set(transX, add(transX, sub(dragX, prevDragX))),
        set(prevDragX, dragX),
        transX,
      ],
      [
        set(prevDragX, 0),
        set(
          transX,
          cond(defined(transX), runSpring(clock, transX, dragVX, snapPoint), 0)
        ),
      ]
    );
  }
  render() {
    const { children, ...rest } = this.props;
    return (
      <PanGestureHandler
        {...rest}
        maxPointers={1}
        minDist={10}
        onGestureEvent={this._onGestureEvent}
        onHandlerStateChange={this._onGestureEvent}>
        <Animated.View style={{ transform: [{ translateX: this._transX }] }}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    );
  }
}

export default class Example extends Component {
  static navigationOptions = {
    title: 'Snappable Example',
  };
  render() {
    return (
      <View style={styles.container}>
        <Snappable>
          <View style={styles.box} />
        </Snappable>
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
