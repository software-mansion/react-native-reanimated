import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  interpolate,
} from 'react-native-reanimated';

export default function App() {
  const błąd = useSharedValue(200);

  const animatedStyles = useAnimatedStyle(() => ({
    // highlight-next-line
    opacity: interpolate(błąd.value, [-200, 200], [1, 0]),
    transform: [{ translateX: błąd.value }],
  }));

  React.useEffect(() => {
    błąd.value = withRepeat(
      withTiming(-błąd.value, { duration: 1500 }),
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
