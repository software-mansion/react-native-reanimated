/* eslint-disable no-inline-styles/no-inline-styles */
import { StyleSheet, View, Button } from 'react-native';

import React, { useReducer } from 'react';
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
          transitionTimingFunction: steps(5),
          backgroundColor: 'red',
          transition:
            'all 0.5s 0.1s steps(4), height 1s 1.5s ease-out, boxShadow 2s ease-in',
          transitionDuration: 1000,
        }}
      />
      <Button title="Toggle width" onPress={toggleState} />
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
