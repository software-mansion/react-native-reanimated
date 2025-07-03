/**
 * This example is meant to be used for temporary purposes only. Code in this
 * file should be replaced with the actual example implementation.
 */

import React from 'react';
import { Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

import { Screen } from '@/apps/css/components';
import { flex } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function Playground() {
  return (
    <Screen style={flex.center}>
      <Text>Hello world!</Text>
      <Svg height={200} width={200}>
        <AnimatedCircle
          cx={100}
          cy={100}
          r={50}
          animatedProps={[
            {
              animationName: {
                from: {
                  r: 10,
                },
                to: {
                  r: 100,
                  cy: 500,
                },
              },
              animationDuration: 1000,
              animationIterationCount: 'infinite',
            },
          ]}
        />
      </Svg>
    </Screen>
  );
}
