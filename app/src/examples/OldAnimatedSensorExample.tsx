import React from 'react';
import Animated, {
  useAnimatedStyle,
  useAnimatedSensor,
  SensorType,
} from 'react-native-reanimated';
import { View, Button, StyleSheet } from 'react-native';

export default function OldAnimatedSensorExample() {
  const animatedSensor = useAnimatedSensor(SensorType.GRAVITY);
  const style = useAnimatedStyle(() => {
    const { x, y } = animatedSensor.sensor.value;
    return {
      transform: [{ translateX: x * 5 }, { translateY: y * 5 }],
    };
  });

  return (
    <View style={componentStyle.container}>
      <Button
        title={'log data'}
        onPress={() => console.log(animatedSensor.sensor.value)}
      />
      <Animated.View style={componentStyle.rect}>
        <Animated.View style={[componentStyle.square, style]} />
      </Animated.View>
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
    width: 10,
    height: 10,
    backgroundColor: 'red',
    position: 'absolute',
    left: 90,
    top: 90,
  },
  rect: {
    width: 200,
    height: 200,
    backgroundColor: 'black',
  },
});
