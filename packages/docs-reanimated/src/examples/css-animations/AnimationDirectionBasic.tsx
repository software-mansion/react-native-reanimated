import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { CSSAnimationKeyframes } from 'react-native-reanimated';

const grow: CSSAnimationKeyframes = {
  from: { width: 120 },
  to: { width: 240 },
};

export default function App() {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            animationName: grow,
            animationDuration: '1s',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
            // highlight-next-line
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
    backgroundColor: '#87cce8',
    margin: 64,
  },
});
