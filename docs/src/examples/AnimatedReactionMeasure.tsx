import React from 'react';
import { Button, StyleSheet, View, Text } from 'react-native';
import Animated, {
  measure,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export default function App() {
  const animatedRef = useAnimatedRef<Animated.View>();
  const width = useSharedValue<number>(100);
  const [text, setText] = React.useState(width.value);

  const handlePress = () => {
    width.value = withSpring(width.value + 50);
  };

  // highlight-start
  useAnimatedReaction(
    () => width.value,
    () => {
      const measurement = measure(animatedRef);

      if (measurement !== null) {
        runOnJS(setText)(measurement.width);
      }
    }
  );
  // highlight-end

  return (
    <View style={styles.container}>
      <Animated.View ref={animatedRef} style={{ ...styles.box, width }} />
      <Text style={styles.label}>width: {text}</Text>
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
  },
});
