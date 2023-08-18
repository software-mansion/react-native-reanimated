import Animated, {
  useAnimatedStyle,
  useAnimatedSensor,
  SensorType,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

import React from 'react';

export default function AnimatedSensorRotationExample() {
  const rotation = useAnimatedSensor(SensorType.ROTATION);

  const animatedStyle = useAnimatedStyle(() => {
    const { pitch, roll, yaw } = rotation.sensor.value;
    return {
      transform: [
        // https://developer.apple.com/documentation/coremotion/cmattitude#1669448
        //A roll is a rotation around a longitudinal axis that passes through the device from its top to bottom.
        { rotateX: `${pitch}rad` },
        //A roll is a rotation around a longitudinal axis that passes through the device from its top to bottom.
        { rotateY: `${roll}rad` },
        // A yaw is a rotation around an axis that runs vertically through the device. It is perpendicular to the body
        // of the device, with its origin at the center of gravity and directed toward the bottom of the device.
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
    borderTopColor: 'yellow',
    borderRightColor: 'red',
    borderLeftColor: 'blue',
    borderBottomColor: 'green',
  },
});
