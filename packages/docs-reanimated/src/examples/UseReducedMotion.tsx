import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface AppProps {
  width: number;
}

export default function App({ width }: AppProps) {
  const sv = useSharedValue<number>(-width / 2 + 160);
  // highlight-next-line
  const reduceMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    // highlight-next-line
    transform: [{ translateX: reduceMotion ? 0 : sv.value }],
  }));

  React.useEffect(() => {
    sv.value = withRepeat(
      withTiming(width / 2 - 160, { duration: 2000 }),
      -1,
      true
    );
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 100,
    width: 100,
    backgroundColor: '#b58df1',
    borderRadius: 20,
  },
  container: {
    flex: 1,
    alignItems: 'center',
  },
});
