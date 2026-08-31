import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, { css } from 'react-native-reanimated';

const fadeIn = css.keyframes({
  from: { opacity: 0.2 },
  to: { opacity: 1 },
});

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const record = (entry: string) =>
    setLog((entries) => [entry, ...entries].slice(0, 3));

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          playing && {
            animationName: fadeIn,
            animationDuration: 1000,
            animationIterationCount: 2,
          },
        ]}
        // highlight-start
        onCSSAnimationStart={() => record('start')}
        onCSSAnimationIteration={(event) =>
          record(`iteration at ${event.elapsedTime}s`)
        }
        onCSSAnimationEnd={(event) => {
          record(`end at ${event.elapsedTime}s`);
          setPlaying(false);
        }}
        // highlight-end
      />
      <Button title="Play" onPress={() => setPlaying(true)} />
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
    gap: 16,
    height: '100%',
  },
  box: {
    backgroundColor: '#82cab2',
    borderRadius: 16,
    height: 72,
    opacity: 0.2,
    width: 72,
  },
  log: { alignItems: 'center', height: 62 },
  entry: { color: '#888', fontFamily: 'monospace', fontSize: 13 },
});
