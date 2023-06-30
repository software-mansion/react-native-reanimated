import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Animated as RNAnimated, View, StyleSheet } from 'react-native';
import React, { useEffect, useRef } from 'react';

const N = 1500;
const array = Array(N).fill(0);

function AnimatedBar() {
  const scaleX = useRef(new RNAnimated.Value(1.5)).current;

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.timing(scaleX, {
        duration: 500,
        toValue: Math.random() * 10,
        useNativeDriver: true,
      }),
      { iterations: -1 }
    ).start();
  }, [scaleX]);

  return <RNAnimated.View style={[styles.bar, { transform: [{ scaleX }] }]} />;
}

function ReanimatedBar() {
  const style = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scaleX: withRepeat(
            withTiming(Math.random() * 10, { duration: 500 }),
            -1,
            true
          ),
        },
      ],
    };
  });

  return <Animated.View style={[styles.bar, style]} />;
}

export default function UpdatePropsPerfExample() {
  return (
    <View style={styles.container}>
      {false && array.map((_, i) => <AnimatedBar key={i} />)}
      {true && array.map((_, i) => <ReanimatedBar key={i} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  bar: {
    width: 100,
    height: 1,
    backgroundColor: 'blue',
  },
});
