import Animated, {
  withTiming,
  useAnimatedStyle,
  useAnimatedSensor,
} from 'react-native-reanimated';
import { View } from 'react-native';
import React from 'react';

function AnimatedStyleUpdateExample(): React.ReactElement {
  const animatedSensor = useAnimatedSensor(2);

  const style = useAnimatedStyle(() => {
    let x = animatedSensor.sensor.x.value;
    x *= x < 0 ? -1 : 1;
    let y = animatedSensor.sensor.y.value;
    y *= y < 0 ? -1 : 1;
    return {
      height: withTiming(x * 100 + 20),
      width: withTiming(y * 100 + 20),
    };
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
