import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { CSSAnimationKeyframes } from 'react-native-reanimated';

const pulse: CSSAnimationKeyframes = {
  from: {
    transform: [{ scale: 0.8 }, { rotateZ: '-15deg' }],
  },
  to: {
    transform: [{ scale: 1.2 }, { rotateZ: '15deg' }],
  },
};

export default function App() {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            animationName: pulse,
            animationDuration: '1s',
            animationTimingFunction: 'ease-in-out',
            // highlight-next-line
            animationFillMode: 'forwards',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  box: {
    height: 120,
    width: 120,
    backgroundColor: '#fa7f7c',
    margin: 64,
  },
});
