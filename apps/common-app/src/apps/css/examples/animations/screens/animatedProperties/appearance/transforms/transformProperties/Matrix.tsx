import React from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';
import type { Transforms } from '@/types';

export default function Matrix() {
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
          description:
            'Transformation matrix must have exactly **16 values**. We can animate between transformation matrix and other transform properties passed as a list of transforms.',
          examples: [
            {
              description: 'Animate from one matrix to another.',
              from: [
                {
                  matrix: [
                    -0.6, 1.34788, 0, 0, -2.34788, -0.6, 0, 0, 0, 0, 1, 0, 0, 0,
                    10, 1,
                  ],
                },
              ],
              title: 'From matrix to matrix',
              to: [
                {
                  matrix: [
                    0.5, 0, -0.866025, 0, 0.595877, 1.2, -1.03209, 0, 0.866025,
                    0, 0.5, 0, 25.9808, 0, 15, 1,
                  ],
                },
              ],
            },
            {
              description: 'Animate from matrix to a list of transforms.',
              from: [
                {
                  matrix: [
                    0.5, 0, -0.866025, 0, 0.595877, 1.2, -1.03209, 0, 0.866025,
                    0, 0.5, 0, 25.9808, 0, 15, 1,
                  ],
                },
              ],
              title: 'From matrix to rotate and scale',
              to: [{ rotate: '45deg' }, { scale: 2 }],
            },
            {
              description:
                'We can combine matrix with other transforms applied to the same element. All transforms will be applied **in** the **order** they are defined and **converted** to a **single transformation matrix**, which then will be interpolated to the target matrix.',
              from: [
                { scale: 2 },
                {
                  matrix: [
                    0.5, 0, -0.866025, 0, 0.595877, 1.2, -1.03209, 0, 0.866025,
                    0, 0.5, 0, 25.9808, 0, 15, 1,
                  ],
                },
                {
                  rotate: '75deg',
                },
              ],
              title: 'Combining matrix with other transforms',
              to: [
                { translateX: '-100%' },
                { rotate: '90deg' },
                { scale: 0.5 },
              ],
            },
          ],
          title: 'Transformation Matrix',
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
