import React, { Component } from 'react';
import { StyleSheet, View, Dimensions, Text } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

const { set, cond, block, eq, add, Value, event } = Animated;

export default class Example extends Component {
  constructor(props) {
    super(props);
    this._transX = new Value(0);
    this._transY = new Value(0);
    const offsetX = new Value(0);
    const offsetY = new Value(0);

    this._onGestureEvent = event([
      {
        nativeEvent: ({ translationX: x, translationY: y, state }) =>
          block([
            set(this._transX, add(x, offsetX)),
            set(this._transY, add(y, offsetY)),
            cond(eq(state, State.END), [
              set(offsetX, add(offsetX, x)),
              set(offsetY, add(offsetY, y)),
            ]),
          ]),
      },
    ]);
  }
  render() {
    return (
      <View style={styles.container}>
        <PanGestureHandler
          maxPointers={1}
          onGestureEvent={this._onGestureEvent}
          onHandlerStateChange={this._onGestureEvent}>
          <Animated.View
            onLayout={this._onLayout}
            style={[
              styles.box,
              {
                transform: [
                  { translateX: this._transX, translateY: this._transY },
                ],
              },
            ]}
          />
        </PanGestureHandler>
      </View>
    );
  }
}

const CIRCLE_SIZE = 70;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderColor: 'black',
    borderWidth: 1,
    backgroundColor: '#123123',
  },
});
