import React from 'react';
import Animated, {
  runOnJS,
  runOnUI,
  setNativeProps,
  useAnimatedRef,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Button, StyleSheet, TextInput, View } from 'react-native';

// const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function Example() {
  const width = useSharedValue(100);

  const [text, onChangeText] = React.useState(
    'This animation clears the input'
  );
  const animatedRef = useAnimatedRef<TextInput>();

  const handlePress = () => {
    width.value = withSpring(width.value + 50, {}, () => {
      runOnJS(onChangeText)('');
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ ...styles.box, width }} />
      <TextInput
        ref={animatedRef}
        style={styles.input}
        onChangeText={onChangeText}
        value={text}
      />
      <Button title="Run animation" onPress={handlePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: { width: 100, height: 100, backgroundColor: 'red' },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
});
