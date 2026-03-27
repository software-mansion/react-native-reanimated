import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

export default function PseudoHoverExample() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Hover over the boxes (mouse / trackpad)</Text>
      <View style={styles.row}>
        <Animated.View
          style={{
            ...styles.box,
            backgroundColor: { default: '#4a90e2', ':hover': '#1a5fb4' },
            transform: {
              default: [{ scale: 1 }],
              ':hover': [{ scale: 1.1 }],
            },
            transitionDuration: '150ms',
          }}
        />
        <Animated.View
          style={{
            ...styles.box,
            backgroundColor: { default: '#e74c3c', ':hover': '#922b21' },
            borderRadius: { default: 16, ':hover': 40 },
            transitionDuration: '200ms',
          }}
        />
        <Animated.View
          style={{
            ...styles.box,
            backgroundColor: { default: '#2ecc71', ':hover': '#1a7a43' },
            opacity: { default: 0.6, ':hover': 1 },
            transitionDuration: '120ms',
          }}
        />
      </View>
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
    gap: 32,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 20,
  },
  box: {
    width: 90,
    height: 90,
    borderRadius: 16,
  },
  description: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    lineHeight: 22,
  },
});
