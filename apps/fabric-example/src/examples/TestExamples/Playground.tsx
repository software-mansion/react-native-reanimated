/**
 * This example is meant to be used for temporary purposes only. Code in this
 * file should be replaced with the actual example implementation.
 */

import type { ViewStyle } from 'react-native';
import { Text, StyleSheet, View, SafeAreaView, Button } from 'react-native';
import React from 'react';
import Animated from 'react-native-reanimated';

const transitionStyles: ViewStyle[] = [
  {
    transform: [
      { perspective: 100 },
      { rotate: '45deg' },
      { skewX: '45deg' },
      { rotateX: '45deg' },
    ],
  },
  {
    transform: [{ translateY: 200 }, { rotate: '45deg' }, { scale: 2 }],
    backgroundColor: 'blue',
    opacity: 0.5,
    borderRadius: 100,
  },
  {
    transform: [
      { perspective: 200 },
      { rotate: '45deg' },
      { translateY: 150 },
      { rotateY: '-25deg' },
      { rotateX: '35deg' },
    ],
    backgroundColor: 'green',
    width: 200,
  },
];

export default function Playground() {
  const [state, setState] = React.useState(0);
  const stateToStyle = (num: number) => {
    return transitionStyles[num % transitionStyles.length];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <Text>Hello world!</Text>
        <Button
          title="Change state"
          onPress={() => {
            setState(state + 1);
            console.log();
          }}
        />
        <Animated.View
          style={[
            {
              marginTop: 60,
              height: 65,
              width: 65,
              transitionProperty: 'all',
              transitionDuration: '0.5s',
              transitionTimingFunction: 'easeInOut',
              backgroundColor: 'red',
            },
            stateToStyle(state),
          ]}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
