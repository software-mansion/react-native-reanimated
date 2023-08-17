import Animated, {
  useAnimatedStyle,
  useAnimatedSensor,
  SensorType,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

import React from 'react';

export default function AnimatedSensorRotationExample() {
  const gravity = useAnimatedSensor(SensorType.ROTATION);

  const animatedStyle = useAnimatedStyle(() => {
    const { pitch, roll, yaw } = gravity.sensor.value;
    return {
      transform: [
        { rotateX: `${pitch}rad` },
        { rotateY: `${roll}rad` },
        { rotateZ: `${yaw}rad` },
      ],
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
    borderWidth: 10,
    backgroundColor: 'navy',
    borderTopColor: 'red',
    borderBottomColor: 'green',
  },
});
