import React, { Component } from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

// setInterval(() => {
//   let iters = 1e8,
//     sum = 0;
//   while (iters-- > 0) sum += iters;
// }, 300);

const { Value, event, concat, round, cond, eq, add, set } = Animated;
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const BOX_SIZE = 100;

export default class PrintingExample extends Component {
  static navigationOptions = {
    title: 'Printing Example',
  };

  constructor(props) {
    super(props);

    const translationX = new Value(0);
    const translationY = new Value(0);
    const state = new Value(-1);

    this._onGestureEvent = event([
      {
        nativeEvent: { translationX, translationY, state },
      },
    ]);

    const offsetX = new Value(BOX_SIZE / 2);
    this._transX = cond(
      eq(state, State.ACTIVE),
      add(offsetX, translationX),
      set(offsetX, add(offsetX, translationX))
    );

    const offsetY = new Value(200);
    this._transY = cond(
      eq(state, State.ACTIVE),
      add(offsetY, translationY),
      set(offsetY, add(offsetY, translationY))
    );
  }

  render() {
    return (
      <View style={styles.container}>
        <PanGestureHandler
          maxPointers={1}
          onGestureEvent={this._onGestureEvent}
          onHandlerStateChange={this._onGestureEvent}>
          <Animated.View
            style={[
              styles.box,
              {
                transform: [
                  {
                    translateX: this._transX,
                    translateY: this._transY,
                  },
                ],
              },
            ]}
          />
        </PanGestureHandler>

        <View style={styles.textBox} pointerEvents="none">
          <AnimatedTextInput
            style={styles.text}
            editable={false}
            text={concat('x: ', round(this._transX))}
          />
          <AnimatedTextInput
            style={styles.text}
            editable={false}
            text={concat('y: ', round(this._transY))}
          />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  textBox: {
    position: 'absolute',
    bottom: 5,
    left: 10,
  },
  text: {
    fontSize: 14,
    padding: 0,
    margin: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderColor: '#F5FCFF',
    backgroundColor: 'plum',
  },
});
