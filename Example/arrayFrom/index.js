import React, { Component } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

const {
  Clock,
  clockRunning,
  cond,
  eq,
  event,
  Extrapolate,
  interpolate,
  multiply,
  set,
  spring,
  startClock,
  stopClock,
  Value,
} = Animated;

function runSpring(clock, value, velocity) {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  };

  const config = {
    damping: 4,
    mass: 1,
    stiffness: 80,
    toValue: new Value(0),
  };

  return [
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.velocity, velocity),
      set(state.position, value),
      startClock(clock),
    ]),
    spring(clock, state, config),
    cond(state.finished, stopClock(clock)),
    state.position,
  ];
}

export default class Example extends Component {
  constructor(props) {
    super(props);

    const translationX = new Value(0);
    const translationY = new Value(0);
    const velocityX = new Value(0);
    const velocityY = new Value(0);
    const state = new Value(-1);
    this._onGestureEvent = event([
      {
        nativeEvent: {
          translationX,
          translationY,
          velocityX,
          velocityY,
          state,
        },
      },
    ]);

    const MAX_DIST = 150;
    const interpolationConfig = {
      inputRange: [-MAX_DIST, MAX_DIST],
      outputRange: [-MAX_DIST, MAX_DIST],
      extrapolate: Extrapolate.CLAMP,
    };
    const interpolatedTranslationX = interpolate(
      translationX,
      interpolationConfig
    );
    const interpolatedTranslationY = interpolate(
      translationY,
      interpolationConfig
    );

    const clockX = new Clock();
    const clockY = new Clock();

    this._x = multiply(
      cond(
        eq(state, State.ACTIVE),
        [stopClock(clockX), interpolatedTranslationX],
        runSpring(clockX, interpolatedTranslationX, velocityX)
      ),
      0.0000075
    );
    this._y = multiply(
      cond(
        eq(state, State.ACTIVE),
        [stopClock(clockY), interpolatedTranslationY],
        runSpring(clockY, interpolatedTranslationY, velocityY)
      ),
      0.0000075
    );
  }

  render() {
    // prettier-ignore
    const matrix = [
      1, 0, 0, this._x,
      0, 1, 0, this._y,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];

    return (
      <View style={styles.container}>
        <PanGestureHandler
          maxPointers={1}
          onGestureEvent={this._onGestureEvent}
          onHandlerStateChange={this._onGestureEvent}>
          <Animated.View style={[styles.box, { transform: [{ matrix }] }]}>
            <Image
              style={styles.img}
              source={{
                uri: 'https://placekitten.com/200/200',
              }}
            />
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  }
}

const BOX_SIZE = 200;

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
    backgroundColor: '#ffcd32',
    borderRadius: BOX_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
  },
  img: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: BOX_SIZE / 2,
  },
});
