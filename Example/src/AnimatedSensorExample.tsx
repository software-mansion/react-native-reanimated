import React from 'react';
import Animated, {
  withTiming,
  useAnimatedStyle,
  useAnimatedSensor,
  SensorType,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';

function AnimatedStyleUpdateExample(): React.ReactElement {
  const animatedSensor = useAnimatedSensor(SensorType.ROTATION, {
    interval: 100,
  });
  const style = useAnimatedStyle(() => {
    let x = animatedSensor.sensor.value.yaw;
    x *= x < 0 ? -1 : 1;
    let y = animatedSensor.sensor.value.pitch;
    y *= y < 0 ? -1 : 1;
    return {
      height: withTiming(x * 200 + 20, { duration: 100 }),
      width: withTiming(y * 200 + 20, { duration: 100 }),
    };
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button
        title={'log data'}
        onPress={() => console.log(animatedSensor.sensor.value)}
      />
      <Animated.View
        style={[
          { width: 100, height: 80, backgroundColor: 'black', margin: 30 },
          style,
        ]}
      />
    </View>
  );
}

export default AnimatedStyleUpdateExample;
