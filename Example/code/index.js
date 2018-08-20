import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
const { width, height } = Dimensions.get('window');

const {
  cond,
  eq,
  add,
  call,
  set,
  Value,
  event,
  interpolate,
  Extrapolate,
  block,
} = Animated;

export default class Example extends React.Component {
  constructor(props) {
    super(props);

    this.onDrop = this.onDrop.bind(this);

    this.dragX = new Value(0);
    this.dragY = new Value(0);
    this.offsetX = new Value(width / 2);
    this.offsetY = new Value(100);
    this.gestureState = new Value(-1);
    this.onGestureEvent = event([
      {
        nativeEvent: {
          translationX: this.dragX,
          translationY: this.dragY,
          state: this.gestureState,
        },
      },
    ]);

    this.addY = add(this.offsetY, this.dragY);
    this.addX = add(this.offsetX, this.dragX);

    this.transX = cond(
      eq(this.gestureState, State.ACTIVE),
      this.addX,
      set(this.offsetX, this.addX)
    );

    this.transY = cond(eq(this.gestureState, State.ACTIVE), this.addY, [
      set(this.offsetY, this.addY),
    ]);
  }

  onDrop([x, y]) {
    if (
      x >= this.left &&
      x <= this.right &&
      (y >= this.top && y <= this.bottom)
    ) {
      alert('You dropped it in the zone!');
    }
  }

  saveDropZone = e => {
    const { width, height, x, y } = e.nativeEvent.layout;
    this.top = y;
    this.bottom = y + height;
    this.left = x;
    this.right = x + width;
  };
  render() {
    return (
      <View style={styles.container}>
        <View style={styles.dropZone} onLayout={this.saveDropZone} />

        <Animated.Code>
          {() =>
            cond(
              eq(this.gestureState, State.END),
              call([this.addX, this.addY], this.onDrop)
            )
          }
        </Animated.Code>
        <PanGestureHandler
          maxPointers={1}
          onGestureEvent={this.onGestureEvent}
          onHandlerStateChange={this.onGestureEvent}>
          <Animated.View
            style={[
              styles.box,
              {
                transform: [
                  {
                    translateX: this.transX,
                  },
                  {
                    translateY: this.transY,
                  },
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
  },
  dropZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,.2)',
    height: '50%',
  },
  box: {
    backgroundColor: 'tomato',
    position: 'absolute',
    marginLeft: -(CIRCLE_SIZE / 2),
    marginTop: -(CIRCLE_SIZE / 2),
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderColor: '#000',
  },
});
