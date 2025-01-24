import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  CSSAnimationKeyframes,
  cubicBezier,
} from 'react-native-reanimated';

const wobble: CSSAnimationKeyframes = {
  from: {
    transform: [{ translateX: 0 }],
  },
  '15%': {
    transform: [{ translateX: -25 }, { rotateZ: '-5deg' }],
  },
  '30%': {
    transform: [{ translateX: 20 }, { rotateZ: '3deg' }],
  },
  '45%': {
    transform: [{ translateX: -15 }, { rotateZ: '-3deg' }],
  },
  '60%': {
    transform: [{ translateX: 10 }, { rotateZ: '2deg' }],
  },
  '75%': {
    transform: [{ translateX: -5 }, { rotateZ: '-1deg' }],
  },
  to: {
    transform: [{ translateX: 0 }],
  },
};

export default function App() {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            animationName: wobble,
            animationDuration: '1s',
            // highlight-next-line
            animationIterationCount: 3,
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
    backgroundColor: '#82cab2',
    margin: 64,
  },
});
