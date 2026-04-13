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
    boxShadow:
      'inset 0 0 20px 10px rgba(34, 197, 94, 0.3), 0 8px 16px #ff6b35, 0 16px 32px rgba(59, 130, 246, 0.4)',
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
    boxShadow: [
      {
        blurRadius: 12,
        color: 'rgba(34, 197, 94, 0.8)',
        offsetX: 0,
        offsetY: 8,
        spreadDistance: 0,
      },
      {
        blurRadius: 8,
        color: '#dc2626',
        inset: true,
        offsetX: 4,
        offsetY: 4,
        spreadDistance: 2,
      },
    ],
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
