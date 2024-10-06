/**
 * This example is meant to be used for temporary purposes only. Code in this
 * file should be replaced with the actual example implementation.
 */

import { Text, StyleSheet, View, SafeAreaView, Button } from 'react-native';
import React from 'react';
import Animated from 'react-native-reanimated';

export default function PlaygroundExample() {
  const [state, setState] = React.useState(0);
  const viewStyles = [
    styles.style0,
    styles.style1,
    styles.style2,
    styles.style3,
  ];
  const stateToStyle = (num: number) => {
    return viewStyles[num % 4];
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
              transitionProperty: 'all',
              transitionDuration: '1.5s',
              transitionTimingFunction: 'easeInOut',
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
  style0: {
    backgroundColor: 'green',
    width: 200,
  },
  style1: {
    backgroundColor: 'red',
    width: 50,
  },
  style2: {
    backgroundColor: 'blue',
    width: 100,
  },
  style3: {
    backgroundColor: 'purple',
    width: 150,
  },
});
