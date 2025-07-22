import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const ROWS = 5;
const COLS = 5;
const SIZE = 50;

export default function OpacityTransformExample() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
  }, [sv]);

  const animatedStyle = useAnimatedStyle(() => ({
    // opacity: 0.5 + sv.value / 2,
    borderRadius: sv.value * 25,
    backgroundColor: interpolateColor(sv.value, [0, 1], ['red', 'lime']),
    // borderColor: interpolateColor(sv.value, [0, 1], ['red', 'lime']),
    // color: interpolateColor(sv.value, [0, 1], ['red', 'lime']),
    // transform: [],
    // transform: [
    //   { perspective: Math.pow(2, sv.value * 3 + 4.5) },
    //   { rotateY: '45deg' },
    // ],
    // transform: [{ rotate: `${sv.value * 90}deg` }],
    // transform: [{ rotate: `${(sv.value * Math.PI) / 2}rad` }],
    // transform: [{ rotateX: `${sv.value * 90}deg` }],
    // transform: [{ rotateX: `${(sv.value * Math.PI) / 2}rad` }],
    // transform: [{ rotateY: `${sv.value * 90}deg` }],
    // transform: [{ rotateY: `${(sv.value * Math.PI) / 2}rad` }],
    // transform: [{ rotateZ: `${sv.value * 90}deg` }],
    // transform: [{ rotateZ: `${(sv.value * Math.PI) / 2}rad` }],
    // transform: [{ scale: 0.5 + sv.value / 2 }],
    // transform: [{ scaleX: 0.5 + sv.value / 2 }],
    // transform: [{ scaleY: 0.5 + sv.value / 2 }],
    // transform: [{ translateX: sv.value * 100 }],
    // transform: [{ translateX: `${sv.value * 100}%` }],
    // transform: [{ translateY: sv.value * 100 }],
    // transform: [{ translateY: `${sv.value * 100}%` }],
    // transform: [{ skewX: `${sv.value * 45}deg` }],
    // transform: [{ skewX: `${(sv.value * Math.PI) / 4}rad` }],
    // transform: [{ skewY: `${sv.value * 45}deg` }],
    // transform: [{ skewY: `${(sv.value * Math.PI) / 4}rad` }],
    // transform: [
    //   { matrix: [sv.value * 2, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 10, 1] },
    // ],
  }));

  return (
    <View style={styles.container}>
      {[...new Array(ROWS)].map((_, i) => (
        <View key={i} style={styles.row}>
          {[...new Array(COLS)].map((_, j) => (
            <Animated.Text key={j} style={[styles.box, animatedStyle]}>
              foo
            </Animated.Text>
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
    borderColor: 'pink',
    borderWidth: 1,
    width: SIZE,
    height: SIZE,
  },
});
