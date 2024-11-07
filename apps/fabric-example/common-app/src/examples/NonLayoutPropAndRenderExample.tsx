import { Button, StyleSheet, View } from 'react-native';

import React, { useState } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function NonLayoutPropAndRenderExample() {
  const [state, setState] = useState(true);

  const toggleSize = () => {
    setState((s) => !s);
  };

  const sv = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(sv.value ? 'red' : 'cyan'),
    };
  });

  const toggleColor = () => {
    sv.value = !sv.value;
  };

  const size = state ? 200 : 100;

  return (
    <View style={styles.container}>
      <View style={styles.wrapper}>
        <Animated.View style={[{ width: size, height: size }, animatedStyle]} />
      </View>
      <Button title="Toggle color" onPress={toggleColor} />
      <Button title="Toggle size" onPress={toggleSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapper: {
    height: 250,
    justifyContent: 'center',
  },
});
