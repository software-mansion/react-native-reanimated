import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';

interface AppProps {
  width: number;
}

export default function App({ width }: AppProps) {
  const offset = useSharedValue(width / 2 - 160);

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  React.useEffect(() => {
    offset.value = withRepeat(
      // highlight-next-line
      withTiming(-offset.value, { duration: 1750 }),
      -1,
      true
    );
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyles]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  box: {
    height: 120,
    width: 120,
    backgroundColor: '#b58df1',
    borderRadius: 20,
  },
});
