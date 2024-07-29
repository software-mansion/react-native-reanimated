import { StyleSheet, View, Button } from 'react-native';
import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

export default function EmptyExample() {
  const leftSV = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return { left: withTiming(leftSV.value) };
  });

  const animatedStyleDelayed = useAnimatedStyle(() => {
    return { left: withDelay(0, withTiming(leftSV.value)) };
  });

  return (
    <View style={styles.container}>
      <Button
        title="toggle"
        onPress={() => {
          leftSV.value = leftSV.value === 200 ? 0 : 200;
        }}
      />
      <Animated.View style={[styles.box, animatedStyle]} />
      <Animated.View style={[styles.box, animatedStyleDelayed]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 50,
  },
  box: {
    height: 50,
    width: 50,
    backgroundColor: 'navy',
    borderRadius: 5,
    margin: 5,
  },
});
