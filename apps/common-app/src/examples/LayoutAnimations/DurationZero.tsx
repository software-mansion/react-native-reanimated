import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, { withTiming } from 'react-native-reanimated';

const customEntering = () => {
  'worklet';
  const animations = {
    width: withTiming(100, { duration: 0 }),
  };
  const initialValues = {
    width: 0,
  };
  return {
    initialValues,
    animations,
  };
};

export default function DurationZeroExample() {
  const [show, setShow] = React.useState(false);
  return (
    <View style={styles.container}>
      <Button title="Click me" onPress={() => setShow(!show)} />
      {show && <Animated.View entering={customEntering} style={styles.box} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'blue',
  },
});
