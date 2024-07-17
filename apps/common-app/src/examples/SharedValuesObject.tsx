import React, { useCallback, useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValuesObject,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const randomColor = () =>
  `#${Math.floor(Math.random() * 16777215).toString(16)}`;

function SingleShareValuesObjectExample() {
  const { height, width } = useWindowDimensions();
  const svo = useSharedValuesObject(({ mutable }) => ({
    x: mutable(0),
    y: mutable(0),
    opacity: mutable(1),
    color: randomColor(),
  }));

  const updatePosition = useCallback(() => {
    svo.x.value = withTiming(Math.random() * width, { duration: 1000 });
    svo.y.value = withTiming(Math.random() * height, { duration: 1000 });
  }, [height, width, svo]);

  useEffect(() => {
    svo.opacity.value = withRepeat(withTiming(1), -1, true);

    updatePosition();
    const interval = setInterval(updatePosition, 1000);

    return () => clearInterval(interval);
  }, [svo, updatePosition]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: svo.x.value },
      { translateY: svo.y.value },
      { translateY: 0 },
    ],
    opacity: svo.opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: svo.color }, animatedStyle]}
    />
  );
}

export default function SharedValuesObjectExample() {
  return (
    <View style={styles.container}>{<SingleShareValuesObjectExample />}</View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
