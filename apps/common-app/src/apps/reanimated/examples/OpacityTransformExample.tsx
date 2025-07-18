import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const ROWS = 25;
const COLS = 15;
const SIZE = 25;

export default function OpacityTransformExample() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
  }, [sv]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + sv.value / 2,
    transform: [
      { scale: 0.5 + sv.value / 2 },
      { rotate: `${sv.value * 90}deg` },
    ],
    backgroundColor: interpolateColor(sv.value, [0, 1], ['red', 'lime']),
  }));

  return (
    <View style={styles.container}>
      {[...new Array(ROWS)].map((_, i) => (
        <View key={i} style={styles.row}>
          {[...new Array(COLS)].map((_, j) => (
            <Animated.View key={j} style={[styles.box, animatedStyle]} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  box: {
    backgroundColor: 'navy',
    width: SIZE,
    height: SIZE,
  },
});
