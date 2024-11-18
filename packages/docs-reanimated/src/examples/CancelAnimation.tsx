import React from 'react';
import { StyleSheet, View, Button } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  cancelAnimation,
} from 'react-native-reanimated';

interface AppProps {
  width: number;
}

export default function App({ width }: AppProps) {
  const offset = useSharedValue<number>(width / 2 - 160);

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const startAnimation = () => {
    offset.value = withRepeat(
      withTiming(offset.value > 0 ? -width / 2 + 160 : width / 2 - 160, {
        duration: 1500,
      }),
      -1,
      true
    );
  };

  React.useEffect(() => {
    startAnimation();
  }, []);

  const handleCancelAnimation = () => {
    // highlight-next-line
    cancelAnimation(offset);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyles]} />
      <View style={styles.row}>
        <Button title="Cancel animation" onPress={handleCancelAnimation} />
        <Button title="Start animation" onPress={startAnimation} />
      </View>
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
    marginBottom: 30,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
});
