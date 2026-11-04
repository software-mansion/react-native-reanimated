import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const TEXT = 'Reanimated types this out on the UI thread.';

export default function App() {
  const length = useSharedValue(0);
  const opacity = useSharedValue(1);

  const typed = useDerivedValue(() => TEXT.slice(0, Math.round(length.value)));

  const cursorStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1
    );
  }, []);

  const type = () => {
    length.value = 0;
    length.value = withTiming(TEXT.length, {
      duration: TEXT.length * 60,
      easing: Easing.linear,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* highlight-next-line */}
        <Animated.Text style={styles.text}>{typed}</Animated.Text>
        <Animated.Text style={[styles.text, cursorStyle]}>|</Animated.Text>
      </View>
      <Button onPress={type} title="Type" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    minHeight: 72,
    marginBottom: 24,
  },
  text: {
    fontSize: 20,
    fontFamily: 'monospace',
    color: '#b58df1',
  },
});
