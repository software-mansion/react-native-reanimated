import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { CSSAnimationKeyframes } from 'react-native-reanimated';

// highlight-start
const march: CSSAnimationKeyframes = {
  '0%': {
    transform: [{ translateX: -150 }, { rotateZ: '-180deg' }],
    backgroundColor: '#fa7f7c',
  },
  '25%': {
    transform: [{ translateX: -75 }, { rotateZ: '-90deg' }],
    backgroundColor: '#b58df1',
  },
  '50%': {
    transform: [{ translateX: 0 }, { rotateZ: '0deg' }],
    backgroundColor: '#ffe780',
  },
  '75%': {
    transform: [{ translateX: 75 }, { rotateZ: '90deg' }],
    backgroundColor: '#82cab2',
  },
  '100%': {
    transform: [{ translateX: 150 }, { rotateZ: '180deg' }],
    backgroundColor: '#87cce8',
  },
};
// highlight-end

export default function App() {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            // highlight-next-line
            animationName: march,
            animationDuration: '2.5s',
            animationTimingFunction: 'easeInOut',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
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
    margin: 64,
  },
});
