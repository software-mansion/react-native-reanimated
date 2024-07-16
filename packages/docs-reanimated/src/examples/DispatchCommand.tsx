import Animated, {
  dispatchCommand,
  useAnimatedRef,
} from 'react-native-reanimated';
import { Button, StyleSheet, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import React from 'react';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function DispatchCommandExample() {
  const aref = useAnimatedRef<TextInput>();

  const gesture = Gesture.Tap().onStart(() => {
    dispatchCommand(aref, 'focus');
  });

  return (
    <View style={styles.container}>
      <AnimatedTextInput ref={aref} style={styles.input} />
      <GestureDetector gesture={gesture}>
        <Button title="Focus" />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    width: 200,
    padding: 5,
  },
});
