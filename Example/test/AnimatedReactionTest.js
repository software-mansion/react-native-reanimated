import React from 'react';
import { Button, View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedReaction,
} from 'react-native-reanimated';

const AnimatedReactionTest = () => {
  const x = useSharedValue(0);
  const x2 = useSharedValue(0);

  const maxX2 = 80;

  useAnimatedReaction(
    () => {
      return x.value / 1.5;
    },
    (data) => {
      if (x2.value < maxX2) {
        x2.value = data;
      }
    }
  );

  const uas = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        {
          translateX: withTiming(x.value),
        },
      ],
    };
  });
  const uas2 = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        {
          translateX: withTiming(x2.value),
        },
      ],
    };
  });

  const handle = () => {
    x.value = x.value + 25;
  };

  const styles = StyleSheet.create({
    box: {
      height: 25,
      width: 50,
      backgroundColor: 'black',
      marginTop: 10,
    },
  });

  return (
    <View>
      <Text>
        The second box should follow the first one for the first 5 moves(then it
        should stop)
      </Text>
      <Button title="Move" onPress={handle} />
      <Animated.View style={[styles.box, uas]} />
      <Animated.View style={[styles.box, uas2]} />
    </View>
  );
};

export default AnimatedReactionTest;
