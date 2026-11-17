import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { css } from 'react-native-reanimated';

const pulse = css.keyframes({
  from: { transform: [{ scale: 1 }] },
  '50%': { transform: [{ scale: 1.3 }] },
  to: { transform: [{ scale: 1 }] },
});

export default function App() {
  const [iterations, setIterations] = useState(0);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            animationName: pulse,
            animationDuration: 1200,
            animationIterationCount: 'infinite',
          },
        ]}
        // highlight-next-line
        onCSSAnimationIteration={() => setIterations((count) => count + 1)}
      />
      <Text style={styles.status}>{iterations} iterations</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    height: '100%',
  },
  box: {
    backgroundColor: '#b58df1',
    borderRadius: 16,
    height: 80,
    width: 80,
  },
  status: { color: '#888', fontFamily: 'monospace' },
});
