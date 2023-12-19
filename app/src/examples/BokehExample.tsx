import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Dimensions, StyleSheet, View } from 'react-native';

import React from 'react';

const { width, height } = Dimensions.get('window');

function getRandomWidth() {
  return Math.random() * width;
}

function getRandomHeight() {
  return Math.random() * height;
}

function getRandomHue() {
  return 100 + Math.random() * 100;
}

function getRandomPositionDiff() {
  return -100 + Math.random() * 200;
}

function getRandomHueDiff() {
  return Math.random() * 100;
}

function Circle() {
  const left = useSharedValue(getRandomWidth());
  const top = useSharedValue(getRandomHeight());
  const hue = useSharedValue(getRandomHue());

  const shouldReduceMotion = useReducedMotion();

  const duration = 2000 + Math.random() * 1000;
  const power = Math.random();
  const config = { duration, easing: Easing.linear };

  const update = () => {
    left.value = withTiming(left.value + getRandomPositionDiff(), config);
    top.value = withTiming(top.value + getRandomPositionDiff(), config);
    hue.value = withTiming(hue.value + getRandomHueDiff(), config);
  };

  React.useEffect(() => {
    update();
    if (shouldReduceMotion) {
      return;
    }
    const id = setInterval(update, duration);
    return () => clearInterval(id);
  });

  const animatedStyle = useAnimatedStyle(() => {
    const size = 100 + power * 250;
    return {
      backgroundColor: `hsl(${hue.value}, 100%, 50%)`,
      width: size,
      height: size,
      top: top.value - size / 2,
      left: left.value - size / 2,
      opacity: 0.1 + (1 - power) * 0.1,
    };
  }, []);

  return <Animated.View style={[styles.bokeh, animatedStyle]} />;
}

interface BokehProps {
  count: number;
}

function Bokeh({ count }: BokehProps) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <Circle key={i} />
      ))}
    </>
  );
}

export default function BokehExample() {
  return (
    <View style={styles.container}>
      <Bokeh count={100} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
    overflow: 'hidden',
  },
  bokeh: {
    position: 'absolute',
    borderRadius: 9999,
  },
});
