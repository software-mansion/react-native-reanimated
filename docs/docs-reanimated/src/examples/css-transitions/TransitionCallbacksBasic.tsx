import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

export default function App() {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState('idle');

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setExpanded((value) => !value)}>
        <Animated.View
          style={[
            styles.box,
            { width: expanded ? 200 : 120 },
            {
              transitionProperty: 'width',
              transitionDuration: 500,
            },
          ]}
          // highlight-start
          onCSSTransitionStart={() => setStatus('running')}
          onCSSTransitionEnd={(event) =>
            setStatus(`finished after ${event.elapsedTime.toFixed(2)}s`)
          }
          // highlight-end
        >
          <Text style={styles.label}>Tap me</Text>
        </Animated.View>
      </Pressable>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    height: '100%',
  },
  box: {
    alignItems: 'center',
    backgroundColor: '#b58df1',
    borderRadius: 16,
    height: 80,
    justifyContent: 'center',
  },
  label: { color: '#f8f9ff', fontWeight: '600' },
  status: { color: '#888', fontFamily: 'monospace' },
});
