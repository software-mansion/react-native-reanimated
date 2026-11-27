import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useRepeatingProgress } from './useRepeatingProgress';

export function TransformBox({ index }: { index: number }) {
  const progress = useRepeatingProgress(index);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.7 * progress.value,
    transform: [
      { translateX: 6 * progress.value },
      { translateY: -6 * progress.value },
      { scale: 0.6 + 0.4 * progress.value },
      { rotate: `${180 * progress.value}deg` },
    ],
  }));

  return <Animated.View style={[styles.box, animatedStyle]} />;
}

const styles = StyleSheet.create({
  box: {
    width: 14,
    height: 14,
    margin: 3,
    backgroundColor: 'tomato',
  },
});
