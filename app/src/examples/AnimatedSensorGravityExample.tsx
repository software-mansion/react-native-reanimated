import Animated, {
  useAnimatedStyle,
  useAnimatedSensor,
  SensorType,
} from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';

import React from 'react';

export default function AnimatedSensorGravityExample() {
  const gravity = useAnimatedSensor(SensorType.GRAVITY);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      top: -gravity.sensor.value.y * 300,
      left: gravity.sensor.value.x * 200,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text>
          Device must be parallel to the ground with screen facing up and top
          edge of the screen facing forward
        </Text>
        <Text>
          On tilt right, the box should move to the right of the screen
        </Text>
        <Text>On tilt left, the box should move to the left of the screen</Text>
        <Text>
          On tilt forward, the box should move to the top of the screen
        </Text>
        <Text>
          On tilt backward, the box should move to the bottom of the screen
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
    backgroundColor: 'navy',
  },
  textContainer: {
    position: 'absolute',
    margin: 16,
    top: 0,
  },
});
