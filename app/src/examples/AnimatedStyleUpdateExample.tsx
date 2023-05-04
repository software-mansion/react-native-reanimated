import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React from 'react';

export default function AnimatedStyleUpdateExample(): React.ReactElement {
  const randomWidth = useSharedValue(10);

  const config = {
    duration: 1000,
    dampingRatio: 1,
  };

  const style1 = useAnimatedStyle(() => {
    return {
      width: withSpring(randomWidth.value, config),
    };
  });
  const style2 = useAnimatedStyle(() => {
    return {
      width: randomWidth.value,
    };
  });

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
      }}>
      <Animated.View
        style={[
          {
            width: 100,
            height: 80,
            backgroundColor: 'black',
            margin: 30,
            marginBottom: 0,
          },
          style1,
        ]}
      />
      <Animated.View
        style={[
          {
            height: 80,
            backgroundColor: 'pink',
            margin: 30,
            marginTop: 0,
          },
          style2,
        ]}
      />
      <Button
        title="toggle"
        onPress={() => {
          randomWidth.value = Math.random() * 250 + 100;
        }}
      />
    </View>
  );
}
