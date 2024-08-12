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
          backgroundColor: 'magenta',
          // @ts-ignore TODO
          animationName: {
            from: {
              width: 50,
              height: 50,
            },
            to: {
              width: 200,
              height: 200,
            },
          },
          animationDuration: '2s',
          animationTimingFunction: 'ease-in-out',
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
