import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function EmptyExample() {
  const sv = useSharedValue(0);

  const eStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      sv.value,
      [0, 1],
      ['yellow', 'transparent']
    ),
  }));

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(1, { duration: 3000 }), -1, true);
  }, [sv]);

  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <Animated.View
        style={[
          styles.box,
          eStyle,
          // {
          //   animationName: {
          //     from: { backgroundColor: 'yellow' },
          //     to: { backgroundColor: 'transparent' },
          //   },
          //   animationDuration: '3000ms',
          //   animationIterationCount: 'infinite',
          //   animationDirection: 'alternate',
          // },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'red',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
