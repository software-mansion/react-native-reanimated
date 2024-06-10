import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { Button, View, StyleSheet } from 'react-native';
import React, { useState } from 'react';

export default function KeyframeAnimation() {
  const [show, setShow] = useState(false);
  const enteringAnimation = new Keyframe({
    from: {
      originX: 50,
      transform: [{ rotate: '45deg' }, { scale: 0.5 }],
    },
    30: {
      transform: [{ rotate: '-90deg' }, { scale: 2 }],
    },
    50: {
      originX: 70,
    },
    100: {
      originX: 0,
      transform: [{ rotate: '0deg' }, { scale: 1 }],
      easing: Easing.quad,
    },
  })
    .duration(2000)
    .withCallback((finished: boolean) => {
      'worklet';
      if (finished) {
        console.log('callback');
      }
    });
  const exitingAnimation = new Keyframe({
    0: {
      opacity: 1,
      originX: 0,
    },
    30: {
      originX: -50,
      easing: Easing.exp,
    },
    to: {
      opacity: 0,
      originX: 500,
    },
  }).duration(2000);
  return (
    <View style={styles.columnReverse}>
      <Button
        title="animate"
        onPress={() => {
          setShow((last) => !last);
        }}
      />
      <View style={styles.blueBoxContainer}>
        {show && (
          <Animated.View
            entering={enteringAnimation}
            exiting={exitingAnimation}
            style={styles.blueBox}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  columnReverse: { flexDirection: 'column-reverse' },
  blueBoxContainer: {
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueBox: {
    height: 100,
    width: 200,
    backgroundColor: 'blue',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
