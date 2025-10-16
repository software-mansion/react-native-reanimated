import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  CSSAnimationKeyframes,
  cubicBezier,
  steps,
} from 'react-native-reanimated';

const square: CSSAnimationKeyframes = {
  '0%': {
    transform: [{ translateX: -80 }, { translateY: -80 }],
    animationTimingFunction: cubicBezier(0.25, 0.1, 0.26, 1.53),
  },
  '25%': {
    transform: [{ translateX: 80 }, { translateY: -80 }],
    animationTimingFunction: 'linear',
  },
  '50%': {
    transform: [{ translateX: 80 }, { translateY: 80 }],
    animationTimingFunction: 'ease-in-out',
  },
  '75%': {
    transform: [{ translateX: -80 }, { translateY: 80 }],
    animationTimingFunction: steps(4, 'end'),
  },
  '100%': {
    transform: [{ translateX: -80 }, { translateY: -80 }],
  },
};

export default function App() {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            animationName: square,
            animationDuration: '4s',
            animationIterationCount: 'infinite',
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
    height: 80,
    width: 80,
    backgroundColor: '#b58df1',
    marginVertical: 64,
  },
});
