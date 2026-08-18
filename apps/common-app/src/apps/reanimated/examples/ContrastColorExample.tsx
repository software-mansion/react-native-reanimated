import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  contrastColor,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const COLORS = [
  'black',
  'white',
  'red',
  'orange',
  'yellow',
  'lime',
  'blue',
  'magenta',
  '#757575',
  '#767676',
];

function StaticRow({ backgroundColor }: { backgroundColor: string }) {
  const color = contrastColor(backgroundColor);

  return (
    <Text style={[styles.row, { backgroundColor, color }]}>
      {backgroundColor} → {color}
    </Text>
  );
}

function AnimatedRow({
  backgroundColor,
  label,
}: {
  backgroundColor: SharedValue<string>;
  label: string;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.value,
    color: contrastColor(backgroundColor.value),
  }));

  return (
    <Animated.Text style={[styles.row, animatedStyle]}>{label}</Animated.Text>
  );
}

export default function ContrastColorExample() {
  const progress = useSharedValue(0);

  const hue = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);

    hue.value = 0;
    hue.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1
    );
  }, [progress, hue]);

  const grayscale = useDerivedValue(() =>
    interpolateColor(progress.value, [0, 1], ['black', 'white'])
  );

  const rainbow = useDerivedValue(() => `hsl(${hue.value}, 100%, 40%)`);

  return (
    <View style={styles.container}>
      <AnimatedRow backgroundColor={grayscale} label="black ↔ white" />
      <AnimatedRow backgroundColor={rainbow} label="hsl(hue, 100%, 40%)" />
      {COLORS.map((color) => (
        <StaticRow backgroundColor={color} key={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 20,
    padding: 20,
  },
  row: {
    textAlign: 'center',
    padding: 10,
  },
});
