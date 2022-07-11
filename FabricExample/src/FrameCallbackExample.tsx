import Animated, {
  useAnimatedStyle,
  useFrameCallback,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

import React from 'react';

export default function FrameCallbackExample() {
  const frameCallback = useFrameCallback(() => {
    console.log("callback");
  });

  const animatedStyle = useAnimatedStyle(() => {
    return { };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 150,
    height: 150,
    backgroundColor: 'navy',
  },
});
