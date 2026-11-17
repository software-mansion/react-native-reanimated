import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

export default function App() {
  const [expanded, setExpanded] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const record = (name: string) =>
    setLog((entries) => [name, ...entries].slice(0, 4));

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setExpanded((value) => !value)}>
        <Animated.View
          style={[
            styles.box,
            { width: expanded ? 220 : 100 },
            { transitionProperty: 'width', transitionDuration: 2000 },
          ]}
          // highlight-start
          onCSSTransitionRun={() => record('run')}
          onCSSTransitionStart={() => record('start')}
          onCSSTransitionEnd={() => record('end')}
          onCSSTransitionCancel={(event) =>
            record(`cancel at ${event.elapsedTime.toFixed(2)}s`)
          }
          // highlight-end
        >
          <Text style={styles.label}>Tap twice, fast</Text>
        </Animated.View>
      </Pressable>
      <View style={styles.log}>
        {log.map((entry, index) => (
          <Text key={index} style={styles.entry}>
            {entry}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    height: '100%',
  },
  box: {
    alignItems: 'center',
    backgroundColor: '#82cab2',
    borderRadius: 16,
    height: 72,
    justifyContent: 'center',
  },
  label: { color: '#f8f9ff', fontWeight: '600' },
  log: { alignItems: 'center', height: 80 },
  entry: { color: '#888', fontFamily: 'monospace', fontSize: 13 },
});
