import { Text, StyleSheet, View } from 'react-native';

import React, { useEffect, useRef } from 'react';
import { runOnUI, useSharedValue } from 'react-native-reanimated';

export default function EmptyExample() {
  const value = useSharedValue(0);
  const valueRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const newValue = valueRef.current + 1;

      // JS
      // value.value = newValue;
      // console.log('SharedValue', value.value);

      // UI
      runOnUI(() => {
        value.value = newValue;
        console.log('SharedValue', value.value);
      })();

      valueRef.current = newValue;
      console.log('valueRef', valueRef.current);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [value]);

  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
