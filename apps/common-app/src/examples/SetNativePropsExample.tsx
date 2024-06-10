import Animated, {
  runOnJS,
  setNativeProps,
  useAnimatedRef,
} from 'react-native-reanimated';
import { Button, StyleSheet } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  TextInput,
} from 'react-native-gesture-handler';

import React from 'react';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function delay(ms: number) {
  const start = performance.now();
  while (performance.now() - start < ms) {}
}

export default function SetNativePropsExample() {
  const [text, setText] = React.useState('Hello');

  const animatedRef = useAnimatedRef<TextInput>();

  const send = () => {
    delay(500);
    console.log('SEND', text);
    setText(''); // calling setText affects the JS state but doesn't update the native view
  };

  const tap = Gesture.Tap().onEnd(() => {
    'worklet';
    setNativeProps(animatedRef, {
      text: '',
      backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
    });
    runOnJS(send)();
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <AnimatedTextInput
        value={text}
        onChangeText={setText}
        style={styles.input}
        ref={animatedRef}
        autoFocus
      />
      <GestureDetector gesture={tap}>
        <Button title="Send" />
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: 250,
    padding: 3,
    borderWidth: 1,
  },
});
