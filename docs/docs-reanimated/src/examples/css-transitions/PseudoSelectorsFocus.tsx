import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function App() {
  return (
    <View style={styles.container}>
      <AnimatedTextInput
        placeholder="Tap to focus"
        placeholderTextColor="#33488e"
        style={[
          styles.input,
          {
            // highlight-next-line
            backgroundColor: { default: '#87cce8', ':focus': '#ffe780' },
            transitionDuration: 250,
          },
        ]}
      />
      <AnimatedTextInput
        placeholder="Tap to focus"
        placeholderTextColor="#33488e"
        style={[
          styles.input,
          {
            // highlight-next-line
            backgroundColor: { default: '#87cce8', ':focus': '#82cab2' },
            transitionDuration: 250,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 16,
  },
  input: {
    borderColor: '#001a72',
    borderRadius: 10,
    borderWidth: 3,
    color: '#001a72',
    height: 48,
    paddingHorizontal: 16,
    width: 240,
  },
});
