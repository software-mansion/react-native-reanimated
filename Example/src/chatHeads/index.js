import React, { Component } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const {
  set,
  neq,
  cond,
  eq,
  add,
  multiply,
  lessThan,
  spring,
  block,
  startClock,
  stopClock,
  clockRunning,
  sub,
  defined,
  Value,
  Clock,
  event,
} = Animated;

function follow(value) {
  const config = {
    damping: 28,
    mass: 0.3,
    stiffness: 188.296,
    overshootClamping: false,
    toValue: value,
    restSpeedThreshold: 0.001,
    restDisplacementThreshold: 0.001,
  };

  const clock = new Clock();

  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  };
  return block([
    cond(clockRunning(clock), 0, startClock(clock)),
    spring(clock, state, config),
    state.position,
  ]);
}

class Tracking extends Component {
  constructor(props) {
    super(props);

    const TOSS_SEC = 0.2;

    const dragX = new Value(0);
    const dragY = new Value(0);

    const gestureState = new Value(-1);
    const dragVX = new Value(0);

    this._onGestureEvent = event([
      {
        nativeEvent: {
          translationX: dragX,
          velocityX: dragVX,
          state: gestureState,
          translationY: dragY,
        },
      },
    ]);

    const transX = new Value(0);
    const transY = new Value(0);
    const clock = new Clock();
    const prevDragX = new Value(0);
    const prevDragY = new Value(0);
    const snapPoint = cond(
      lessThan(add(transX, multiply(TOSS_SEC, dragVX)), 0),
      -(width / 2),
      width / 2
    );

    const config = {
      damping: 12,
      mass: 1,
      stiffness: 150,
      overshootClamping: false,
      restSpeedThreshold: 0.001,
      restDisplacementThreshold: 0.001,
      toValue: snapPoint,
    };

    const state = {
      finished: new Value(0),
      velocity: dragVX,
      position: new Value(0),
      time: new Value(0),
    };

    this._transX = cond(
      eq(gestureState, State.ACTIVE),
      [
        stopClock(clock),
        set(transX, add(transX, sub(dragX, prevDragX))),
        set(prevDragX, dragX),
        transX,
      ],
      cond(neq(gestureState, -1), [
        set(prevDragX, 0),
        set(
          transX,
          cond(
            defined(transX),
            [
              cond(clockRunning(clock), 0, [
                set(state.finished, 0),
                set(state.velocity, dragVX),
                set(state.position, transX),
                startClock(clock),
              ]),
              spring(clock, state, config),
              cond(state.finished, stopClock(clock)),
              state.position,
            ],
            0
          )
        ),
      ])
    );

    this._transY = block([
      cond(
        eq(gestureState, State.ACTIVE),
        [
          set(transY, add(transY, sub(dragY, prevDragY))),
          set(prevDragY, dragY),
        ],
        set(prevDragY, 0)
      ),
      transY,
    ]);

    this.follow1x = follow(this._transX);
    this.follow1y = follow(this._transY);

    this.follow2x = follow(this.follow1x);
    this.follow2y = follow(this.follow1y);

    this.follow3x = follow(this.follow2x);
    this.follow3y = follow(this.follow2y);
  }

  render() {
    return (
      <View style={styles.container}>
        <Animated.Image
          style={[
            styles.box,
            {
              transform: [
                { translateX: this.follow3x }, 
                { translateY: this.follow3y },
              ],
            },
          ]}
          source={{
            uri: 'https://avatars3.githubusercontent.com/u/1714764?s=460&v=4',
          }}
        />
        <Animated.Image
          style={[
            styles.box,
            {
              transform: [
                { translateX: this.follow2x }, 
                { translateY: this.follow2y },
              ],
            },
          ]}
          source={{
            uri: 'https://avatars3.githubusercontent.com/u/90494?v=4&s=460',
          }}
        />

        <Animated.Image
          style={[
            styles.box,
            {
              transform: [
                { translateX: this.follow1x }, 
                { translateY: this.follow1y },
              ],
            },
          ]}
          source={{
            uri: 'https://avatars3.githubusercontent.com/u/25709300?s=460&v=4',
          }}
        />
        <PanGestureHandler
          maxPointers={1}
          minDist={10}
          onGestureEvent={this._onGestureEvent}
          onHandlerStateChange={this._onGestureEvent}>
          <Animated.Image
            style={[
              styles.box,
              {
                transform: [
                  { translateX: this._transX }, 
                  { translateY: this._transY },
                ],
              },
            ]}
            source={{
              uri: 'https://avatars3.githubusercontent.com/u/726445?v=4&s=460',
            }}
          />
        </PanGestureHandler>
      </View>
    );
  }
}

export default class Example extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Tracking />
      </View>
    );
  }
}

const BOX_SIZE = 80;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  box: {
    position: 'absolute',
    width: BOX_SIZE,
    height: BOX_SIZE,
    alignSelf: 'center',
    borderColor: '#F5FCFF',
    borderRadius: BOX_SIZE / 2,
    margin: BOX_SIZE / 2,
  },
});
