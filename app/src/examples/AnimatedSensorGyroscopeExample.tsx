import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
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
const OFFSET_Z = 180; // in degrees

export default function AnimatedSensorGyroscopeExample() {
  const gyroscope = useAnimatedSensor(SensorType.GYROSCOPE);

  const xOffset = useSharedValue(-OFFSET_X);
  const yOffset = useSharedValue(0);
  const zOffset = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const { x, y, z } = gyroscope.sensor.value;
    // The x vs y here seems wrong but is the way to make it feel right to the user
    xOffset.value = clamp(xOffset.value + y, -OFFSET_X * 2, OFFSET_X / 4);
    yOffset.value = clamp(yOffset.value - x, -OFFSET_Y, OFFSET_Y);
    zOffset.value = clamp(zOffset.value + z, -OFFSET_Z, OFFSET_Z);
    return {
      transform: [
        { translateX: withSpring(-OFFSET_X - xOffset.value) },
        { translateY: withSpring(yOffset.value) },
        { rotateZ: `${zOffset.value}deg` },
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
        <Text>On tilt right, the box should move to the left</Text>
        <Text>On tilt left, the box should move to the right</Text>
        <Text>On tilt forward, the box should move backward</Text>
        <Text>On tilt backward, the box should move forward</Text>
        <Text>
          On turning phone clockwise, the box should turn counter clockwise
        </Text>
        <Text>
          On turning phone counter clockwise, the box should turn clockwise
        </Text>
      </View>
      <View style={styles.wrapper}>
        <Animated.View style={[styles.box, animatedStyle]} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  wrapper: {
    flex: 1,
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
