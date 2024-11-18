import React, { useEffect } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolateColor,
  cancelAnimation,
  withTiming,
  InterpolationOptions,
} from 'react-native-reanimated';

interface InterpolateColorProps {
  outputRange: any[];
  colorSpace: 'RGB' | 'HSV';
  options: InterpolationOptions;
}

const initialProgress = 0;

export default function App({
  outputRange,
  colorSpace,
  options,
}: InterpolateColorProps) {
  const progress = useSharedValue(initialProgress);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        outputRange,
        colorSpace,
        options
      ),
    };
  });

  useEffect(() => {
    cancelAnimation(progress);

    progress.value = initialProgress;
  }, [outputRange, colorSpace, options]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyle]} />
      <Button
        onPress={() => {
          progress.value = withTiming(1 - progress.value, { duration: 1000 });
        }}
        title="run animation"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  box: {
    height: 100,
    width: 100,
    borderRadius: 20,
    marginVertical: 64,
  },
});
