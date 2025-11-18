import { colors, radius, sizes } from '@/theme';
import React, { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, {
  css,
  FadeInLeft,
  FadeOutRight,
  LayoutAnimationConfig,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function EmptyExample2() {
  const [state, setState] = React.useState(50);
  const sv = useSharedValue(100);

  const animatedStyle = useAnimatedStyle(() => {
    if (sv.value < 150) {
      return {
        width: sv.value,
      };
    } else {
      return {
        height: sv.value,
      };
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => prev + 1);
    }, 10);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    sv.value = withTiming(200, { duration: 2000 });
  }, [sv]);

  return (
    <View style={styles.container}>
      <Text>State: {state}</Text>
      <Animated.View style={[styles.box, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    backgroundColor: 'red',
    borderRadius: radius.sm,
    height: sizes.sm,
    width: sizes.sm,
  },
  wrapper: {
    backgroundColor: 'blue',
    borderRadius: radius.sm,
    width: 200,
  },
});
