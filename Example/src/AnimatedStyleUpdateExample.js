import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React from 'react';

export default function AnimatedStyleUpdateExample(props) {
  const randomWidth = useSharedValue(10);
  const rotate = useSharedValue('0deg');

  const config = {
    duration: 500,
    easing: Easing.bezier(0.5, 0.01, 0, 1),
  };

  useAnimatedReaction(
    () => {
      return randomWidth.value;
    },
    (val) => {
      rotate.value = withTiming(`${val}deg`, config);
      console.log('react');
    }
  );

  const style = useAnimatedStyle(() => {
    console.log('ooorotate', rotate.value);
    return {
      width: withTiming(randomWidth.value, config),
      transform: [{ rotate: rotate.value }],
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
          { width: 100, height: 80, backgroundColor: 'black', margin: 30 },
          style,
        ]}
      />
      <Button
        title="toggle"
        onPress={() => {
          randomWidth.value = Math.random() * 350;
        }}
      />
    </View>
  );
}
