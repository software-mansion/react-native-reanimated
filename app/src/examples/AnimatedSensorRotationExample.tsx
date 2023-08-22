import Animated, {
  SensorType,
  useAnimatedSensor,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';

import React from 'react';

export default function AnimatedSensorRotationExample() {
  const rotation = useAnimatedSensor(SensorType.ROTATION);

  const animatedStyle = useAnimatedStyle(() => {
    const { pitch, roll, yaw } = rotation.sensor.value;
    return {
      transform: [
        { perspective: 100 },
        // https://developer.apple.com/documentation/coremotion/cmattitude#1669448
        // A roll is a rotation around a longitudinal axis that passes through the device from its top to bottom.
        // we are negating the value to make the behavior more as user would expect
        { rotateX: `${-pitch}rad` },
        // A roll is a rotation around a longitudinal axis that passes through the device from its top to bottom.
        { rotateY: `${roll}rad` },
        // A yaw is a rotation around an axis that runs vertically through the device. It is perpendicular to the body
        // of the device, with its origin at the center of gravity and directed toward the bottom of the device.
        { rotateZ: `${yaw}rad` },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text>
          Device must be parallel to the ground with screen facing up and top
          edge of the screen facing forward
        </Text>
        <Text>On tilt right, the blue edge should enlarge</Text>
        <Text>On tilt left, the red edge should enlarge</Text>
        <Text>On tilt forward, the green edge should enlarge</Text>
        <Text>On tilt backward, the yellow should move forward</Text>
        <Text>
          On turning phone clockwise, the box should rotate counter clockwise
        </Text>
        <Text>
          On turning phone counter clockwise, the box should rotate clockwise
        </Text>
      </View>
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
  textContainer: {
    position: 'absolute',
    margin: 16,
    top: 0,
  },
});
