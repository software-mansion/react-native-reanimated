import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  // Easing, <- this should be the correct import
} from 'react-native-reanimated';
import { View, Button, StyleSheet, Easing } from 'react-native';
import React from 'react';

export default function AnimatedStyleUpdateExample() {
  const randomWidth = useSharedValue(10);

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(randomWidth.value, {
        easing: Easing.linear,
      }),
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, style]} />
      <Button
        title="toggle"
        onPress={() => {
          randomWidth.value = Math.random() * 350;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  box: {
    width: 100,
    height: 80,
    backgroundColor: 'black',
    margin: 30,
  },
});
