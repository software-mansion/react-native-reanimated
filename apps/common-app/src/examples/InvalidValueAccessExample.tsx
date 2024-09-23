import { Text, StyleSheet, View, Button } from 'react-native';

import React, { useEffect } from 'react';
import Animated, {
  configureReanimatedLogger,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

configureReanimatedLogger({
  // change to `false` to disable the warning
  strict: true,
});

export default function InvalidValueAccessExample() {
  const [counter, setCounter] = React.useState(0);
  const [updateFromUseEffect, setUpdateFromUseEffect] = React.useState(false);
  const sv = useSharedValue(0);

  if (!updateFromUseEffect) {
    // logs writing to `value`... warning
    sv.value = counter;
    // logs reading from `value`... warning
    console.log('shared value:', sv.value);
  }

  useEffect(() => {
    if (updateFromUseEffect) {
      // no warning is logged
      sv.value = counter;
      // no warning is logged
      console.log('useEffect shared value:', sv.value);
    }
  }, [sv, counter, updateFromUseEffect]);

  const reRender = () => {
    setCounter((prev) => prev + 1);
  };

  const animatedBarStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: withTiming(Math.sin((sv.value * Math.PI) / 10)) }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.text}>
          Update from:{' '}
          <Text style={styles.highlight}>
            {updateFromUseEffect ? 'useEffect' : 'component'}
          </Text>
        </Text>
        <Button
          title="change"
          onPress={() => setUpdateFromUseEffect((prev) => !prev)}
        />
      </View>
      <Button title="Re-render" onPress={reRender} />
      <Text>Counter: {counter}</Text>
      <Animated.View style={[styles.bar, animatedBarStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    height: 20,
    backgroundColor: 'blue',
    width: '100%',
  },
  text: {
    fontSize: 16,
  },
  highlight: {
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
