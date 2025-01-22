import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { CSSAnimationKeyframes } from 'react-native-reanimated';

const COLORS = ['#fa7f7c', '#b58df1', '#ffe780', '#82cab2', '#87cce8'];

const rotate: CSSAnimationKeyframes = {
  '0%': {
    transform: [{ rotateY: '0deg' }],
  },
  '100%': {
    transform: [{ rotateY: '180deg' }],
  },
};

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {COLORS.map((color, id) => (
          <Animated.View
            key={color}
            style={[
              styles.box,
              {
                backgroundColor: color,
                animationName: rotate,
                animationDuration: 2000,
                animationTimingFunction: 'ease',
                animationDelay: 250 * id,
                // highlight-next-line
                animationDirection: 'alternateReverse',
                animationIterationCount: 'infinite',
              },
            ]}
          />
        ))}
      </View>
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
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  box: {
    width: 100,
    height: 100,
    marginVertical: 64,
  },
});
