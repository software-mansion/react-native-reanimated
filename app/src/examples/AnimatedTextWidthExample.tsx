import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

import React from 'react';

export default function AnimatedTextWidthExample() {
  const sv = useSharedValue(0);

  React.useEffect(() => {
    sv.value = withRepeat(
      withTiming(2 * Math.PI, { easing: Easing.linear, duration: 2500 }),
      -1
    );
    return () => {
      sv.value = 0;
    };
  });

  const animatedStyle = useAnimatedStyle(() => {
    return { width: (1.4 + Math.sin(sv.value)) * 150 };
  }, [sv]);

  return (
    <View style={styles.container}>
      <Animated.Text numberOfLines={1} style={[styles.text, animatedStyle]}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis quis neque
        vel leo pharetra laoreet.
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
  },
});
