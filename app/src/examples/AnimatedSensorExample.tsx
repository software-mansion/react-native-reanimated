import Animated, {
  useAnimatedStyle,
  useAnimatedSensor,
  SensorType,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

import React from 'react';

export default function AnimatedSensorExample() {
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: 16 });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      top: -gravity.sensor.value.y * 300,
      left: gravity.sensor.value.x * 200,
    };
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
