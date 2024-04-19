import { View, Button, StyleSheet } from 'react-native';
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
      {/* Don't render anything if component is undefined to prevent blinking */}
      {component || null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
});
