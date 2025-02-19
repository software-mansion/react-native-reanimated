import React, { useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function Circle() {
  const shouldReduceMotion = useReducedMotion();

  const [power] = useState(randBetween(0, 1));
  const [duration] = useState(randBetween(2000, 3000));

  const size = 100 + power * 250;
  const opacity = 0.1 + (1 - power) * 0.1;
  const config = { duration, easing: Easing.linear };

  const left = useSharedValue(randBetween(0, width) - size / 2);
  const top = useSharedValue(randBetween(0, height) - size / 2);
  const hue = useSharedValue(randBetween(100, 200));

  const update = () => {
    left.value = withTiming(left.value + randBetween(-100, 100), config);
    top.value = withTiming(top.value + randBetween(-100, 100), config);
    hue.value = withTiming(hue.value + randBetween(0, 100), config);
  };

  React.useEffect(() => {
    update();
    if (shouldReduceMotion) {
      return;
    }
    const id = setInterval(update, duration);
    return () => clearInterval(id);
  });

  const animatedStyle = useAnimatedStyle(
    () => ({
      backgroundColor: `hsl(${hue.value},100%,50%)`,
      width: size,
      height: size,
      left: left.value,
      top: top.value,
    }),
    []
  );

  return <Animated.View style={[styles.circle, { opacity }, animatedStyle]} />;
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
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
});
