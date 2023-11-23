import { View, Button, StyleSheet, Text } from 'react-native';
import React, { useEffect, useState } from 'react';
import { runTests, configure } from './RuntimeTestsApi';
import { LockObject } from './TestRunner';

let renderLock: LockObject = { lock: false };

export default function RuntimeTestsRunner() {
  const [component, renderComponent] = useState(false);
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
          renderLock = configure({ render: renderComponent });
          await runTests();
        }}
      />
      {component}
      {!component && <Text> Press "Run tests" button to start tests </Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
});
