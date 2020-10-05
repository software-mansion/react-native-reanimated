import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  useAnimatedReaction,
  withRepeat,
  withDelay,
  withSequence,
  withSpring,
  withDecay,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React from 'react';

export default function AnimatedStyleUpdateExample(props) {
  const randomWidth = useSharedValue(10);
  // const color = useSharedValue('blue');
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
      console.log('worklet2', _WORKLET);
      // rotate.value = withSequence(withTiming(`${val}deg`, config), withTiming(`${40}deg`, config));
      // rotate.value = withDelay(2000, withTiming(`${val}deg`))
      // rotate.value = withRepeat(withTiming(`${val}deg`, config));
       rotate.value = withSpring(`${val}deg`);
       // color.value = withTiming('red', config);
    }
  );

  const style = useAnimatedStyle(() => {
    console.log("example", rotate.value);
    return {
      width: withTiming(randomWidth.value, config),
       // backgroundColor: color.value,
      transform: [{rotate: rotate.value}],
    };
  });

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
        backgroundColor: 'yellow',
      }}>
      <Animated.View
        style={[
          { width: 100, height: 80, margin: 30, backgroundColor: 'black' },
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
