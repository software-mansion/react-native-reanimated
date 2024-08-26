import { Text, StyleSheet, View } from 'react-native';

import React from 'react';
import Animated, { useFrameCallback } from 'react-native-reanimated';

export default function EmptyExample() {
  useFrameCallback(() => {
    // this is just to trigger performOperations on each animation frame
  });

  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <Animated.View
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'blue',
          // @ts-ignore TODO
          animationName: {
            from: {
              width: 50,
              height: 50,
              transform: [{ scale: 0 }, { translateX: 0 }],
            },
            0.2: {
              width: 300,
              opacity: 1,
            },
            '50%': {
              height: 600,
              opacity: 0.25,
              transform: [{ scale: 1 }, { translateX: 100 }],
            },
            0.75: {
              width: 300,
              opacity: 1,
              transform: [{ translateX: -200 }],
            },
            to: {
              width: 200,
              height: 200,
              transform: [{ translateX: 0 }],
            },
          },
          animationDuration: '2s',
          animationTimingFunction: 'linear',
        }}
      />

      <Animated.View
        style={{
          height: 50,
          backgroundColor: 'cyan',
          // @ts-ignore TODO
          animationName: {
            from: {
              width: 0,
            },
            to: {
              width: 300,
            },
          },
          animationDuration: '1500ms',
          animationTimingFunction: 'ease-in-out-back',
        }}
      />
      <Animated.View
        style={{
          height: 50,
          backgroundColor: 'magenta',
          // @ts-ignore TODO
          animationName: {
            from: {
              width: 0,
            },
            to: {
              width: 300,
            },
          },
          animationDuration: '1500ms',
          animationTimingFunction: 'linear',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
