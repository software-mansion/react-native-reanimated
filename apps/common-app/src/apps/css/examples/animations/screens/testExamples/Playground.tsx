/**
 * This example is meant to be used for temporary purposes only. Code in this
 * file should be replaced with the actual example implementation.
 */

import React from 'react';
import { Text, View } from 'react-native';
import { createAnimatedComponent, css } from 'react-native-reanimated';

import { Screen } from '@/apps/css/components';
import { flex } from '@/theme';

const AnimatedView = createAnimatedComponent(View);

const jump = css.keyframes({
  from: {
    transform: [{ translateY: 0 }],
  },
  to: {
    transform: [{ translateY: 100 }],
  },
});

const color = css.keyframes({
  from: {
    backgroundColor: 'red',
  },
  to: {
    backgroundColor: 'blue',
  },
});

export default function Playground() {
  return (
    <Screen style={flex.center}>
      <Text>Hello world!</Text>
      <AnimatedView
        style={[
          styles.parent,
          {
            animation: `
              ${jump} 1s infinite alternate cubic-bezier(0,-0.54,1,-0.5), 
              ${color} 1s infinite
            `,
          },
        ]}
      />
    </Screen>
  );
}

const styles = css.create({
  child: {
    animationDirection: ['normal', 'alternate'],
    animationDuration: '10s',
    animationIterationCount: 'infinite',
    animationName: [
      css.keyframes({
        0.1: {
          width: '75%',
        },
        0.2: {
          width: 20,
        },
        0.3: {
          width: '50%',
        },
        0.4: {
          width: 20,
        },
        0.5: {
          width: '75%',
        },
        0.6: {
          width: 0,
        },
        0.7: {
          width: '100%',
        },
        0.8: {
          width: '25%',
        },
        0.9: {
          width: '75%',
        },
        from: {
          width: 20,
        },
      }),
      css.keyframes({
        to: {
          backgroundColor: 'red',
        },
      }),
    ],
    animationTimingFunction: 'linear',
    backgroundColor: 'gold',
    height: '100%',
    shadowColor: 'black',
    width: 20,
  },
  parent: {
    // animationDuration: '10s',
    // animationIterationCount: 'infinite',
    // animationName: [
    //   css.keyframes({
    //     0: {
    //       width: 200,
    //     },
    //     0.5: {
    //       width: 350,
    //     },
    //     1: {
    //       width: 200,
    //     },
    //   }),
    //   css.keyframes({
    //     '50%': { height: 200 },
    //   }),
    //   css.keyframes({
    //     from: {
    //       transform: [{ rotate: '0deg' }],
    //     },
    //     to: {
    //       transform: [{ rotate: '360deg' }],
    //     },
    //   }),
    // ],
    // animationTimingFunction: 'linear',
    backgroundColor: 'gray',
    height: 65,
    width: 200,
  },
  row: {
    flexDirection: 'row',
    height: '50%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
