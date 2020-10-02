import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  useAnimatedReaction,
  withRepeat,
  withDelay,
  withSequence,
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
      //rotate.value = withSequence(withTiming(`${val}deg`, config), withTiming(`${40}deg`, config));
      // rotate.value = withDelay(2000, withTiming(`${val}deg`))
      // rotate.value = withRepeat(withTiming(`${val}deg`, config));
    }
  );

  const style = useAnimatedStyle(() => {
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
