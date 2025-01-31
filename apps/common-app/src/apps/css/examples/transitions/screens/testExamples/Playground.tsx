/**
 * This example is meant to be used for temporary purposes only. Code in this
 * file should be replaced with the actual example implementation.
 */

import { useState } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, Screen } from '@/apps/css/components';

const transitionStyles: Array<ViewStyle> = [
  {
    boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.5)',
  },
  {
    boxShadow:
      '0 0 20px 20px red, 20px 20px 20px 20px blue, -20px -20px 20px 20px green',
  },
];

export default function Playground() {
  const [state, setState] = useState(0);
  const stateToStyle = (num: number) => {
    return transitionStyles[num % transitionStyles.length];
  };

  return (
    <Screen>
      <View style={styles.container}>
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
              transitionTimingFunction: 'ease-in-out',
              width: 65,
            },
            stateToStyle(state),
          ]}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
