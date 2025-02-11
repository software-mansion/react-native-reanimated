/* eslint-disable perfectionist/sort-objects */
import React, { useReducer } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, { steps } from 'react-native-reanimated';

export default function EmptyExample() {
  const [state, toggleState] = useReducer((s) => !s, false);

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          width: state ? 200 : 100,
          height: state ? 200 : 100,
          transform: [{ rotate: state ? '45deg' : '0deg' }],
          transitionTimingFunction: steps(2), // overridden by the shorthand
          backgroundColor: 'red',
          transition: 'transform 2s ease-in',
          transitionDuration: 1000, // overrides the shorthand
        }}
      />
      <Button title="Toggle width" onPress={toggleState} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
