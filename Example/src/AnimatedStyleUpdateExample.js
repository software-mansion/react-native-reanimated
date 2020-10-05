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
  const color = useSharedValue('blue');
  const rotate = useSharedValue('0deg');
  let index = 0; // useSharedValue(0);
  const colors = ['red', 'grey', 'yellow', 'white', 'darkslateblue'];

  const config = {
    duration: 500,
    easing: Easing.bezier(0.5, 0.01, 0, 1),
  };

  useAnimatedReaction(
    () => {
      return randomWidth.value;
    },
    (val) => {
      // rotate.value = withSequence(withTiming(`${val}deg`, config), withTiming(`${40}deg`, config));
      // rotate.value = withDelay(2000, withTiming(`${val}deg`))
      // rotate.value = withRepeat(withTiming(`${val}deg`, config));
      // rotate.value = withSpring(`${val}deg`);
      // index.value = ( index.value + 1 ) % colors.length;
      // color.value = withTiming(colors[index.value], config);
      // color.value = withSpring(colors[index.value]);
      // color.value = withDecay({velocity: 6});
    }
  );

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(randomWidth.value, config),
      // backgroundColor: withTiming(color.value, config),
      backgroundColor: withSpring(color.value),
      // transform: [{rotate: rotate.value}],
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
          { width: 100, height: 80, margin: 30 },
          style,
        ]}
      />
      <Button
        title="toggle"
        onPress={() => {
          randomWidth.value = Math.random() * 350;
          color.value = colors[(++index)%colors.length];
        }}
      />
    </View>
  );
}
