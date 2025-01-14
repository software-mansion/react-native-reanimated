/**
 * This example is meant to be used for temporary purposes only. Code in this
 * file should be replaced with the actual example implementation.
 */

import { useState } from 'react';
import type { ViewStyle } from 'react-native';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

const transitionStyles: Array<ViewStyle> = [
  {
    transform: [
      { perspective: 100 },
      { rotate: '45deg' },
      { skewX: '45deg' },
      { rotateX: '45deg' },
    ],
  },
  {
    backgroundColor: 'blue',
    borderRadius: 100,
    opacity: 0.5,
    transform: [{ translateY: 200 }, { rotate: '45deg' }, { scale: 2 }],
  },
  {
    backgroundColor: 'green',
    transform: [
      { perspective: 200 },
      { rotate: '45deg' },
      { translateY: 150 },
      { rotateY: '-25deg' },
      { rotateX: '35deg' },
    ],
    width: 200,
  },
];

export default function Playground() {
  const [state, setState] = useState(0);
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
          }}
        />
        <Animated.View
          style={[
            {
              backgroundColor: 'red',
              height: 65,
              marginTop: 60,
              transitionDuration: '0.5s',
              transitionProperty: 'all',
              transitionTimingFunction: 'easeInOut',
              width: 65,
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
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
