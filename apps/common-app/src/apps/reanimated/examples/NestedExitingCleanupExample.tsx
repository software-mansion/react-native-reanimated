import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

const EXIT_DURATION_MS = 2000;

export default function NestedExitingCleanupExample() {
  const [mounted, setMounted] = useState(true);
  const [key, setKey] = useState(0);

  const reset = () => {
    setMounted(true);
    setKey((prevKey) => prevKey + 1);
  };

  return (
    <View style={styles.container}>
      <Button
        disabled={!mounted}
        title="Remove subtree permanently"
        onPress={() => setMounted(false)}
      />
      <Button disabled={mounted} title="Reset example" onPress={reset} />
      <Text style={styles.instructions}>
        Set the native breakpoints, press Remove once, and do not remount the
        subtree. After {EXIT_DURATION_MS} milliseconds, empty but visible
        red/blue boxes mean ancestor cleanup stopped.
      </Text>

      <View
        collapsable={false}
        testID="cleanup-root"
        style={styles.container}
        key={`cleanup-root-${key}`}>
        {mounted && (
          <View
            collapsable={false}
            testID="cleanup-removal-root"
            style={styles.removalRoot}>
            <View
              collapsable={false}
              testID="cleanup-structural-wrapper"
              style={styles.structuralWrapper}>
              <Animated.View
                collapsable={false}
                testID="cleanup-animated-child"
                exiting={FadeOut.duration(EXIT_DURATION_MS)}
                style={styles.animatedChild}>
                <Text>Animated child exits for {EXIT_DURATION_MS} ms</Text>
              </Animated.View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
    padding: 16,
  },
  instructions: {
    color: '#666',
  },
  removalRoot: {
    borderColor: '#E63946',
    borderWidth: 3,
    padding: 16,
  },
  structuralWrapper: {
    borderColor: '#457B9D',
    borderWidth: 3,
    padding: 16,
  },
  animatedChild: {
    alignItems: 'center',
    backgroundColor: '#A8DADC',
    justifyContent: 'center',
    minHeight: 120,
    padding: 16,
  },
});
