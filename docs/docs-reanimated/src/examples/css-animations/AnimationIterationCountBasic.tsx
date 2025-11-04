import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  CSSAnimationKeyframes,
  cubicBezier,
} from 'react-native-reanimated';

const rotate: CSSAnimationKeyframes = {
  from: {
    transform: [{ rotateZ: '0deg' }],
  },
  to: {
    transform: [{ rotateZ: '360deg' }],
  },
};

export default function App() {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            animationName: rotate,
            animationDuration: '2s',
            // highlight-next-line
            animationIterationCount: 'infinite',
            animationTimingFunction: cubicBezier(0.25, -0.5, 0.25, 1),
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
