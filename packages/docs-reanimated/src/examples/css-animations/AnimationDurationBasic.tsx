import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { CSSAnimationKeyframes } from 'react-native-reanimated';

const slide: CSSAnimationKeyframes = {
  '0%': {
    transform: [{ translateX: -150 }],
  },
  '100%': {
    transform: [{ translateX: 150 }],
  },
};

export default function App() {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            animationName: slide,
            // highlight-next-line
            animationDuration: '2s',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            animationTimingFunction: 'easeInOut',
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
    backgroundColor: '#ffe780',
    marginVertical: 64,
  },
});
