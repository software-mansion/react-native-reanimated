import Animated, {
  withTiming,
  useAnimatedStyle,
  // Easing,
  useAnimatedSensor,
  // SensorType,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React from 'react';

function AnimatedStyleUpdateExample(): React.ReactElement {
  const animatedSensor = useAnimatedSensor(2);

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(animatedSensor.sensor.y.value * 150 + 20),
    };
  });

  // console.log(animatedSensor);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
      }}>
      <Animated.View
        style={[
          { width: 100, height: 80, backgroundColor: 'black', margin: 30 },
          style,
        ]}
      />
      <Button
        title="toggle"
        onPress={() => {
          // randomWidth.value = Math.random() * 350;
          // animatedSensor.unregister()
          console.log(animatedSensor);
          console.log('mleko');
        }}
      />
    </View>
  );
}

export default AnimatedStyleUpdateExample;
