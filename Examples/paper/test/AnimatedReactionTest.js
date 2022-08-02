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
  const x3 = useSharedValue(0);

  const maxX2 = 80;

  // UAR #1
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

  // UAR #2
  useAnimatedReaction(
    () => {
      return x.value > 125 ? x.value : null;
    },
    (data, previous) => {
      if (data !== previous) {
        x3.value = data - 125;
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

  const uas3 = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        {
          translateX: withTiming(x3.value),
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
        should stop). After that, the third box should start moving.
      </Text>
      <Button title="Move" onPress={handle} />
      <Animated.View style={[styles.box, uas]} />
      <Animated.View style={[styles.box, uas2]} />
      <Animated.View style={[styles.box, uas3]} />
    </View>
  );
};

export default AnimatedReactionTest;
