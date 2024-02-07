import { View, Button, StyleSheet, Text } from 'react-native';
import React, { ReactNode, useEffect, useState } from 'react';
import { runTests, configure } from './RuntimeTestsApi';
import { LockObject } from './types';

let renderLock: LockObject = { lock: false };

export default function RuntimeTestsRunner() {
  const [component, setComponent] = useState<ReactNode | null>(null);
  useEffect(() => {
    if (renderLock) {
      renderLock.lock = false;
    }
  }, [component]);
  return (
    <View style={styles.container}>
      <Button
        title="Run tests"
        onPress={async () => {
          renderLock = configure({ render: setComponent });
          await runTests();
        }}
      />
      {component || <Text> Press "Run tests" button to start tests </Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
});
