import React, { useState } from 'react';
import { View, Button, StyleSheet, Pressable } from 'react-native';
import Animated, { Keyframe, Easing } from 'react-native-reanimated';

export default function KeyframeExample() {
  const [visible, setVisible] = useState(true);

  const enteringAnimation = new Keyframe({
    0: {
      opacity: 0,
      transform: [
        { translateY: 50 },
        { rotate: '820deg' },
        { skewX: '0deg' },
        { scale: 0 },
      ],
    },
    50: {
      opacity: 0.5,
      transform: [
        { translateY: 25 },
        { rotate: '-180deg' },
        { skewX: '30deg' },
        { scale: 0.5 },
      ],
      easing: Easing.out(Easing.quad),
    },
    100: {
      opacity: 1,
      transform: [
        { translateY: 0 },
        { rotate: '0deg' },
        { skewX: '0deg' },
        { scale: 1 },
      ],
    },
  }).duration(1000);

  const exitingAnimation = new Keyframe({
    0: {
      opacity: 1,
      transform: [{ translateY: 0 }, { rotateZ: '0deg' }],
    },
    10: {
      opacity: 1,
      transform: [{ translateY: 25 }, { rotateZ: '0deg' }],
      easing: Easing.exp,
    },
    50: {
      opacity: 0.5,
      transform: [{ translateY: -200 }, { rotateZ: '60deg' }],
    },
    100: {
      opacity: 0,
      transform: [{ translateY: -500 }, { rotateZ: '120deg' }],
    },
  }).duration(1000);

  return (
    <View style={styles.container}>
      <Button title="Animate box" onPress={() => setVisible(!visible)} />
      {visible && (
        <Animated.View
          entering={enteringAnimation}
          exiting={exitingAnimation}
          style={styles.box}>
          <Pressable
            onPress={() => setVisible(!visible)}
            style={styles.button}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '50%',
    flex: 1,
    justifyContent: 'space-between',
    marginVertical: 80,
    alignItems: 'center',
  },
  button: {
    height: '100%',
    width: '100%',
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: '#87cce8',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
