import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  SensorType,
  useAnimatedSensor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

function clamp(num: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(num, min), max);
}

const OFFSET_X = 100; //in px
const OFFSET_Y = 100; //in px
const OFFSET_Z = 180; //in degrees

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
      <Pressable
        style={styles.button}
        onPress={() => {
          xOffset.value = -OFFSET_X;
          yOffset.value = 0;
          zOffset.value = 0;
        }}>
        <Text>Reset</Text>
      </Pressable>
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
  box: {
    backgroundColor: 'navy',
    height: 100,
    width: 100,
  },
  button: {
    flex: 1,
    maxHeight: 40,
    marginTop: 16,
    backgroundColor: 'red',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
});
