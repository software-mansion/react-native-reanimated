import React from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes } from '@/theme';
import type { Transforms } from '@/types';
import { ExamplesScreen } from '~/css/components';

export default function Skew() {
  return (
    <ExamplesScreen<{ from: Transforms; to: Transforms }>
      buildAnimation={({ from, to }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: {
          from: {
            transform: from,
          },
          to: {
            transform: to,
          },
        },
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[styles.box, animation]} />
      )}
      sections={[
        {
          description: 'Skewing an element along the x-axis.',
          examples: [
            {
              from: [{ skewX: '0deg' }],
              title: 'skewX from 0° to 45°',
              to: [{ skewX: '45deg' }],
            },
            {
              from: [{ skewX: '0rad' }],
              title: 'skewX from 0 to -π/3',
              to: [{ skewX: `-${Math.PI / 3}rad` }],
            },
          ],
          title: 'X skew',
        },
        {
          description: 'Skewing an element along the y-axis.',
          examples: [
            {
              from: [{ skewY: '0deg' }],
              title: 'skewY from 0° to 45°',
              to: [{ skewY: '45deg' }],
            },
            {
              from: [{ skewY: '0rad' }],
              title: 'skewY from 0 to π/3',
              to: [{ skewY: `${Math.PI / 3}rad` }],
            },
          ],
          title: 'Y skew',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
    width: sizes.md,
  },
});
