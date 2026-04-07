import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

export default function PseudoActiveExample() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Press and hold the box</Text>
      <Animated.View
        style={{
          ...styles.box,
          transitionDuration: '1000ms',
          transitionTimingFunction: 'ease-in-out',
          opacity: { default: 1, ':active': 0.6 },
          transform: {
            default: [{ scale: 1 }, { rotate: '0deg' }],
            ':active': [{ scale: 0.7 }, { rotate: '45deg' }],
          },
          backgroundColor: { default: '#4a90e2', ':active': 'pink' },
        }}
      />
      <Text style={styles.description}>
        Style changes happen in C++ on UI thread.{'\n'}
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
    gap: 24,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  box: {
    width: 150,
    height: 150,
    borderRadius: 16,
  },
  description: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    lineHeight: 22,
  },
});
