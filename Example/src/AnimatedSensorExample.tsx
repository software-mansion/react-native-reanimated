import React from 'react';
import Animated, {
  withTiming,
  useAnimatedStyle,
  useAnimatedSensor,
  SensorType,
} from 'react-native-reanimated';
import { View, Button, StyleSheet } from 'react-native';

export default function AnimatedStyleUpdateExample() {
  const animatedSensor = useAnimatedSensor(SensorType.ROTATION, {
    interval: 10,
  });
  const style = useAnimatedStyle(() => {
    const yaw = Math.abs(animatedSensor.sensor.value.yaw);
    const pitch = Math.abs(animatedSensor.sensor.value.pitch);
    return {
      height: withTiming(yaw * 200 + 20, { duration: 100 }),
      width: withTiming(pitch * 200 + 20, { duration: 100 }),
    };
  });

  return (
    <View style={componentStyle.container}>
      <Button
        title={'log data'}
        onPress={() => console.log(animatedSensor.sensor.value)}
      />
      <Animated.View style={[componentStyle.square, style]} />
    </View>
  );
}

const componentStyle = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  square: {
    width: 50,
    height: 50,
    backgroundColor: 'black',
    margin: 30,
  },
});
