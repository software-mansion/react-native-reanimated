import React, { Component } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
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
  abs,
  modulo,
  round,
  interpolate,
  divide,
  sub,
  color,
  Value,
  event,
} = Animated;

const PICKER_WIDTH = Dimensions.get('window').width;
const PICKER_HEIGHT = Dimensions.get('window').height;

function match(condsAndResPairs, offset = 0) {
  if (condsAndResPairs.length - offset === 1) {
    return condsAndResPairs[offset];
  } else if (condsAndResPairs.length - offset === 0) {
    return undefined;
  }
  return cond(
    condsAndResPairs[offset],
    condsAndResPairs[offset + 1],
    match(condsAndResPairs, offset + 2)
  );
}

function colorHSV(h /* 0 - 360 */, s /* 0 - 1 */, v /* 0 - 1 */) {
  // Converts color from HSV format into RGB
  // Formula explained here: https://www.rapidtables.com/convert/color/hsv-to-rgb.html
  const c = multiply(v, s);
  const hh = divide(h, 60);
  const x = multiply(c, sub(1, abs(sub(modulo(hh, 2), 1))));

  const m = sub(v, c);

  const colorRGB = (r, g, b) =>
    color(
      round(multiply(255, add(r, m))),
      round(multiply(255, add(g, m))),
      round(multiply(255, add(b, m)))
    );

  return match([
    lessThan(h, 60),
    colorRGB(c, x, 0),
    lessThan(h, 120),
    colorRGB(x, c, 0),
    lessThan(h, 180),
    colorRGB(0, c, x),
    lessThan(h, 240),
    colorRGB(0, x, c),
    lessThan(h, 300),
    colorRGB(x, 0, c),
    colorRGB(c, 0, x) /* else */,
  ]);
}

export default class Example extends Component {
  static navigationOptions = {
    title: 'Colors Example',
  };

  constructor(props) {
    super(props);

    const dragX = new Value(0);
    const dragY = new Value(0);
    const state = new Value(-1);

    this._onGestureEvent = event([
      {
        nativeEvent: { translationX: dragX, translationY: dragY, state: state },
      },
    ]);

    const offsetX = new Value(PICKER_WIDTH / 2);
    this._transX = cond(
      eq(state, State.ACTIVE),
      add(offsetX, dragX),
      set(offsetX, add(offsetX, dragX))
    );

    const offsetY = new Value(200);
    this._transY = cond(
      eq(state, State.ACTIVE),
      add(offsetY, dragY),
      set(offsetY, add(offsetY, dragY))
    );

    const h = interpolate(this._transX, {
      inputRange: [0, PICKER_WIDTH],
      outputRange: [0, 360],
      extrapolate: 'clamp',
    });
    const s = interpolate(this._transY, {
      inputRange: [0, PICKER_HEIGHT],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    const v = 1;
    this._color = colorHSV(h, s, v);
  }

  render() {
    return (
      <View style={styles.container}>
        <PanGestureHandler
          maxPointers={1}
          minDist={10}
          onGestureEvent={this._onGestureEvent}
          onHandlerStateChange={this._onGestureEvent}>
          <Animated.View
            style={[
              styles.box,
              {
                backgroundColor: this._color,
                transform: [
                  { translateX: this._transX }, { translateY: this._transY },
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
  },
  box: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    marginLeft: -CIRCLE_SIZE / 2,
    marginTop: -CIRCLE_SIZE / 2,
    borderRadius: CIRCLE_SIZE / 2,
    borderColor: 'black',
    borderWidth: 1,
  },
});
