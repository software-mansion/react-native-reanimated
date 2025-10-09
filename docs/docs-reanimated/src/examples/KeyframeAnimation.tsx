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
      transform: [{ translateY: -100 }, { rotateZ: '60deg' }],
    },
    100: {
      opacity: 0,
      transform: [{ translateY: -300 }, { rotateZ: '120deg' }],
    },
  }).duration(1000);

  return (
    <View style={styles.container}>
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
      <Button title="Animate box" onPress={() => setVisible(!visible)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 250,
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  button: {
    height: '100%',
    width: '100%',
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: '#b58df1',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
});
