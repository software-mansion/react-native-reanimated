import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAnimatedGestureHandler } from 'react-native-reanimated';

export default function EmptyExample() {
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTicker((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const onStart = useCallback(() => {
    'worklet';
  }, []);
  const onActive = useCallback(() => {
    'worklet';
  }, []);
  const onFinish = useCallback(() => {
    'worklet';
  }, []);

  const gestureHandler = useAnimatedGestureHandler(
    {
      onStart,
      onActive,
      onFinish,
    },
    []
  );

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
