import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing } from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Box from '../Box';
import Row from '../Row';

const {
  set,
  cond,
  sub,
  eq,
  add,
  multiply,
  lessThan,
  startClock,
  stopClock,
  clockRunning,
  Value,
  Clock,
  event,
  interpolate,
  defined,
} = Animated;

export default class WithDrag extends Component {
  constructor(props) {
    super(props);
    const TOSS_SEC = 0.2;

    const dragX = new Value(0);
    const state = new Value(-1);
    const transX = new Value(0);
    const prevDragX = new Value(0);

    this._onGestureEvent = event([
      { nativeEvent: { translationX: dragX, state: state } },
    ]);

    this._transX = cond(
      eq(state, State.ACTIVE),
      [
        set(transX, add(transX, sub(dragX, prevDragX))),
        set(prevDragX, dragX),
        transX,
      ],
      [set(prevDragX, 0), transX]
    );

    this._transXA = interpolate(this._transX, {
      inputRange: [-120, 120],
      outputRange: [-100, 100],
    });
    this._transXB = interpolate(this._transX, {
      inputRange: [-120, -60, 60, 120],
      outputRange: [-60, -10, 10, 60],
    });
  }
  render() {
    return (
      <View style={styles.container}>
        <Row>
          <PanGestureHandler
            maxPointers={1}
            minDist={10}
            onGestureEvent={this._onGestureEvent}
            onHandlerStateChange={this._onGestureEvent}>
            <Box style={{ transform: [{ translateX: this._transX }] }} />
          </PanGestureHandler>
        </Row>
        <Row>
          <Box style={{ transform: [{ translateX: this._transXA }] }} />
        </Row>
        <Row>
          <Box style={{ transform: [{ translateX: this._transXB }] }} />
        </Row>
      </View>
    );
  }
}

const BOX_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
