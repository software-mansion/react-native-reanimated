import { Text, StyleSheet, View, Button } from 'react-native';

import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function EmptyExample() {
  const [counter, setCounter] = React.useState(0);
  const sv = useSharedValue(0);

  // logs writing to `value`... warning
  sv.value = counter;
  // logs reading from `value`... warning
  console.log('shared value:', sv.value);

  useEffect(() => {
    // no warning is logged
    sv.value = counter;
    // no warning is logged
    console.log('useEffect shared value:', sv.value);
  }, [sv, counter]);

  const reRender = () => {
    setCounter((prev) => prev + 1);
  };

  const animatedBarStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: withTiming(Math.sin((sv.value * Math.PI) / 10)) }],
  }));

  return (
    <View style={styles.container}>
      <Button title="Re-render" onPress={reRender} />
      <Text>Counter: {counter}</Text>
      <Animated.View style={[styles.bar, animatedBarStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    height: 20,
    backgroundColor: 'blue',
    width: '100%',
  },
});
