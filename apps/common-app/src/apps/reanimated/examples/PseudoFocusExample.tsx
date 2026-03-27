import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { createAnimatedComponent } from 'react-native-reanimated';

const AnimatedTextInput = createAnimatedComponent(TextInput);

export default function PseudoFocusExample() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tap a field to focus it</Text>
      <AnimatedTextInput
        style={{
          ...styles.input,
          transitionDuration: '200ms',
          borderColor: { default: '#ccc', ':focus': '#c70ab7' },
          opacity: { default: 0.6, ':focus': 1 },
          borderWidth: { default: 2, ':focus': 4 },
        }}
        placeholder="Username"
      />
      <AnimatedTextInput
        style={{
          ...styles.input,
          transitionDuration: '200ms',
          borderColor: { default: '#ccc', ':focus': '#4a90e2' },
          opacity: { default: 0.6, ':focus': 1 },
          borderWidth: { default: 2, ':focus': 4 },
        }}
        placeholder="Password"
        secureTextEntry
      />
      <Text style={styles.description}>
        Border color and opacity animate in C++ on UI thread.{'\n'}
        No JS frame should appear on the profiler.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    width: 280,
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  description: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
});
