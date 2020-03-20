import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useReanimatedState } from 'react-native-reanimated';

const TOSS_SEC = 0.2;

function gestureEventHandler(event, context) {
  // update as we
  context.transX = context.startTransX + event.translationX;
}

function gestureStateHandler(event, context, animation) {
  const { prevState, state, velocityX } = event;
  if (prevState != state) {
    if (state == State.ACTIVE) {
      // store starting position when dragging starts
      context.startTransX = transX;
    } else if (prevState == State.ACTIVE) {
      // snap to -100 or 100
      const endPosition = context.transX + velocityX * TOSS_SEC;
      animation.spring(context.transX, {
        to: endPosition < 0 ? -100 : 100,
        velocity: velocityX,
      });
    }
  }
}

function Snappable({ children, ...rest }) {
  const reanimated = useReanimatedState({
    startTransX: 0,
    transX: 0,
  });

  return (
    <PanGestureHandler
      {...rest}
      maxPointers={1}
      minDist={10}
      onGestureEvent={gestureEventHandler}
      onHandlerStateChange={gestureStateHandler}>
      <Animated.View style={{ transform: [{ translateX: reanimated.transX }] }}>
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
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
