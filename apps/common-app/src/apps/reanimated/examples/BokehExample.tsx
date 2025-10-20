import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface CircleProps {
  size: number;
  opacity: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startHue: number;
  endHue: number;
}

function Circle({
  duration,
  startX,
  startY,
  endX,
  endY,
  startHue,
  endHue,
  size,
  opacity,
}: CircleProps) {
  const shouldReduceMotion = useReducedMotion();

  const left = useSharedValue(startX);
  const top = useSharedValue(startY);
  const hue = useSharedValue(startHue);

  useEffect(() => {
    left.value = startX;
    top.value = startY;
    hue.value = startHue;

    const numberOfReps = shouldReduceMotion ? 1 : -1;
    const config = { duration, easing: Easing.linear };

    left.value = withRepeat(withTiming(endX, config), numberOfReps, true);
    top.value = withRepeat(withTiming(endY, config), numberOfReps, true);
    hue.value = withRepeat(withTiming(endHue, config), numberOfReps, true);
  }, [
    duration,
    startX,
    startY,
    startHue,
    endX,
    endY,
    endHue,
    hue,
    left,
    top,
    shouldReduceMotion,
  ]);

  const animatedStyle = useAnimatedStyle(
    () => ({
      backgroundColor: `hsl(${hue.value},100%,50%)`,
      transform: [{ translateX: left.value }, { translateY: top.value }],
    }),
    []
  );

  return (
    <Animated.View
      style={[
        styles.circle,
        { opacity, width: size, height: size },
        animatedStyle,
      ]}
    />
  );
}

interface BokehProps {
  count: number;
}

function Bokeh({ count }: BokehProps) {
  const circles = useMemo(
    () => Array.from({ length: count }, makeBokehCircleParams),
    [count]
  );

  return circles.map((circleProps, i) => <Circle {...circleProps} key={i} />);
}

export default function BokehExample() {
  return (
    <View style={styles.container}>
      <Bokeh count={100} />
    </View>
  );
}

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function makeBokehCircleParams(): CircleProps {
  const power = randBetween(0, 1);
  const size = 100 + power * 250;
  const opacity = 0.1 + (1 - power) * 0.1;

  const duration = randBetween(2000, 3000);

  const startX = randBetween(0, width) - size / 2;
  const startY = randBetween(0, height) - size / 2;

  const endX = startX + randBetween(-100, 100);
  const endY = startY + randBetween(-100, 100);

  const startHue = randBetween(0, 360);
  const endHue = randBetween(0, 360);

  return {
    duration,
    startX,
    startY,
    endX,
    endY,
    startHue,
    endHue,
    size,
    opacity,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
});
