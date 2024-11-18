import React from 'react';
import { Button, StyleSheet, View, TextInput } from 'react-native';
import Animated, {
  MeasuredDimensions,
  measure,
  useAnimatedProps,
  useAnimatedRef,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function App() {
  const animatedRef = useAnimatedRef<Animated.View>();
  const width = useSharedValue<number>(100);
  const text = useSharedValue(100);

  const handlePress = () => {
    width.value = withTiming(width.value + 50, {}, () => {
      // highlight-next-line
      const measurement: MeasuredDimensions | null = measure(animatedRef);

      if (measurement === null) {
        return;
      }

      text.value = Math.floor(measurement.width);
    });
  };

  const animatedProps = useAnimatedProps(() => {
    return {
      text: `width: ${text.value}`,
      defaultValue: `width: ${text.value}`,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View ref={animatedRef} style={{ ...styles.box, width }} />
      <AnimatedTextInput animatedProps={animatedProps} style={styles.label} />
      <Button onPress={handlePress} title="Click me" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  box: {
    height: 100,
    backgroundColor: '#b58df1',
    borderRadius: 20,
  },
  label: {
    fontSize: 24,
    marginVertical: 16,
    color: '#b58df1',
    textAlign: 'center',
  },
});
