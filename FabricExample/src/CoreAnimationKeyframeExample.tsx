import { Button, StyleSheet, View } from 'react-native';

import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withKeyframe,
} from 'react-native-reanimated';

export default function KeyframeExample() {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: x.value }, { translateY: y.value }],
    };
  });

  const handlePress = () => {
    const keys = [0, 0.25, 0.5, 0.75, 1];
    const config = { duration: 1.5 };
    const callback = () => {
      'worklet';
      console.log('finished');
    };

    x.value = withKeyframe(keys, [0, 100, 100, 0, 0], config, callback);
    y.value = withKeyframe(keys, [0, 0, 100, 100, 0], config, callback);
  };

  return (
    <View style={styles.container}>
      <Button title="Animate" onPress={handlePress} />
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
    marginTop: 30,
    width: 100,
    height: 100,
    backgroundColor: 'navy',
  },
});
