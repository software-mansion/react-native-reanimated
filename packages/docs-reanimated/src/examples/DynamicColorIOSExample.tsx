import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { DynamicColorIOS } from 'react-native-reanimated';

const LIGHT_COLORS = ['#38acdd', '#57b495'];
const DARK_COLORS = ['#b58df1', '#ff6259'];

export default function DynamicColorIOSExample() {
  const progress = useSharedValue(0);

  useEffect(() => {
    const interval = setInterval(() => {
      progress.value = withTiming(progress.value === 0 ? 1 : 0);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const lightColor = interpolateColor(progress.value, [0, 1], LIGHT_COLORS);
    const darkColor = interpolateColor(progress.value, [0, 1], DARK_COLORS);

    return {
      backgroundColor: DynamicColorIOS({
        light: lightColor,
        dark: darkColor,
      }),
    };
  });

  return (
    <View
      style={{
        flex: 1,
        padding: 16,
        justifyContent: 'space-evenly',
        alignItems: 'center',
      }}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 100,
    width: 100,
  },
});
