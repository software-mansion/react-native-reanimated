import { View, Button, StyleSheet } from 'react-native';
import React, { useEffect, useState } from 'react';
import { runTests, setConfig } from './RuntimeTests';
import './tests/Animations.test';

let conditionalWaiting;
export default function RuntimeTestsRunner() {
  const [component, renderComponent] = useState(false); 
  useEffect(() => {
    if (conditionalWaiting) {
      conditionalWaiting.lock = false;
    }
  }, [component]);
  return (
    <View style={styles.container}>
      <Button title="Run tests" onPress={async () => {
        conditionalWaiting = setConfig({ render: renderComponent});
        await runTests();
      }} />
      { component }
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
});
