import { View, Button, StyleSheet } from 'react-native';
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { runTests, configure } from './RuntimeTestsApi';

export default function RuntimeTestsRunner() {
  const isRenderLocked = useRef<boolean>(false);
  const [component, setComponent] = useState<ReactNode | null>(null);
  useEffect(() => {
    if (isRenderLocked.current) {
      isRenderLocked.current = false;
    }
  }, [component]);
  return (
    <View style={styles.container}>
      <Button
        title="Run tests"
        onPress={async () => {
          isRenderLocked.current = configure({ render: setComponent }).lock;
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
