import React, { useState } from 'react';
import { View, Button, StyleSheet, SafeAreaView } from 'react-native';
import Animated, { withTiming, withDelay } from 'react-native-reanimated';

const WIDTH = 200;

const customEntering = (targetValues) => {
  'worklet';
  const animations = {
    originX: withTiming(targetValues.targetOriginX, { duration: 3000 }),
    opacity: withTiming(1, { duration: 2000 }),
    borderRadius: withDelay(1500, withTiming(40, { duration: 3000 })),
    transform: [
      { rotate: withTiming('0deg', { duration: 4000 }) },
      { scale: withTiming(1, { duration: 3500 }) },
    ],
  };
  const initialValues = {
    originX: -WIDTH,
    opacity: 0,
    borderRadius: 10,
    transform: [{ rotate: '90deg' }, { scale: 0.2 }],
  };
  return {
    initialValues,
    animations,
  };
};

const customExiting = (values) => {
  'worklet';
  const animations = {
    originX: withTiming(2 * WIDTH, { duration: 3000 }),
    opacity: withTiming(0, { duration: 2000 }),
    transform: [{ scale: withTiming(0.2, { duration: 3500 }) }],
  };
  const initialValues = {
    originX: values.currentOriginX,
    opacity: 1,
    transform: [{ scale: 1 }],
  };
  return {
    initialValues,
    animations,
  };
};

export default function EnteringExample() {
  const [show, setShow] = useState(false);

  return (
    <SafeAreaView>
      <View style={styles.container}>
        <Button title="Click me" onPress={() => setShow(!show)} />
        {show && (
          <Animated.View
            style={styles.card}
            entering={customEntering}
            exiting={customExiting}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    padding: 128,
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
  },
  card: {
    width: WIDTH,
    height: 300,
    backgroundColor: '#b58df1',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
  },
});
