import React from 'react';
import { SafeAreaView, StyleSheet, View, Text } from 'react-native';
import Animated, {
  clamp,
  SensorType,
  useAnimatedSensor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const OFFSET_X = 100; // in px
const OFFSET_Y = 100; // in px

export default function AnimatedSensorAccelerometerExample() {
  const accelerometer = useAnimatedSensor(SensorType.ACCELEROMETER);

  const xOffset = useSharedValue(-OFFSET_X);
  const yOffset = useSharedValue(0);
  const zOffset = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    const { x, y, z } = accelerometer.sensor.value;
    xOffset.value = clamp(xOffset.value - x, -OFFSET_X * 2, OFFSET_X / 4);
    yOffset.value = clamp(yOffset.value - y, -OFFSET_Y, OFFSET_Y);
    zOffset.value = clamp(zOffset.value + z * 0.1, 0.5, 2);
    return {
      transform: [
        { translateX: withSpring(-OFFSET_X - xOffset.value) },
        { translateY: withSpring(yOffset.value) },
        { scaleX: withSpring(zOffset.value) },
        { scaleY: withSpring(zOffset.value) },
      ],
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.textContainer}>
        <Text>
          Device must be parallel to the ground with screen facing up and top
          edge of the screen facing forward
        </Text>
        <Text>
          On acceleration to the right, the box should move to the left
        </Text>
        <Text>
          On acceleration to the left, the box should move to the right
        </Text>
        <Text>On acceleration forward, the box should move backward</Text>
        <Text>On acceleration backward, the box should move forward</Text>
        <Text>On acceleration up, the box should get smaller</Text>
        <Text>On acceleration down, the box should get bigger</Text>
      </View>
      <Animated.View style={[styles.box, animatedStyle]} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    position: 'absolute',
    margin: 16,
    top: 0,
  },
  box: {
    backgroundColor: 'navy',
    height: 100,
    width: 100,
  },
});
