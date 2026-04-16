import React from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';
import type { Transforms } from '@/types';

export default function Translate() {
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
      tabs={[
        {
          name: 'Absolute',
          sections: [
            {
              description: 'Translating an element along the x-axis.',
              examples: [
                {
                  from: [{ translateX: 0 }],
                  title: 'translateX from 0 to 100',
                  to: [{ translateX: 100 }],
                },
              ],
              title: 'X translation',
            },
            {
              description: 'Translating an element along the y-axis.',
              examples: [
                {
                  from: [{ translateY: 0 }],
                  title: 'translateY from 0 to 100',
                  to: [{ translateY: 100 }],
                },
              ],
              title: 'Y translation',
            },
            {
              description: 'Both translations combined.',
              examples: [
                {
                  from: [{ translateX: 0 }, { translateY: 0 }],
                  title: 'translateX and translateY from 0 to 100',
                  to: [{ translateX: 100 }, { translateY: 100 }],
                },
              ],
              title: 'XY translation',
            },
          ],
        },
        {
          name: 'Relative',
          sections: [
            {
              description:
                'Translating an element along the x-axis. The value is **relative to** the element `width`.',
              examples: [
                {
                  from: [{ translateX: '0%' }],
                  title: 'translateX from 0% to 100%',
                  to: [{ translateX: '100%' }],
                },
              ],
              title: 'X translation',
            },
            {
              description:
                'Translating an element along the y-axis. The value is **relative to** the element `height`.',
              examples: [
                {
                  from: [{ translateY: '0%' }],
                  title: 'translateY from 0% to 100%',
                  to: [{ translateY: '100%' }],
                },
              ],
              title: 'Y translation',
            },
            {
              description: 'Both translations combined.',
              examples: [
                {
                  from: [{ translateX: '0%' }, { translateY: '0%' }],
                  title: 'translateX and translateY from 0% to 100%',
                  to: [{ translateX: '100%' }, { translateY: '100%' }],
                },
              ],
              title: 'XY translation',
            },
          ],
        },
        {
          name: 'Mixed',
          sections: [
            {
              description:
                'Translating between pixels and percentages. The percentage value is **relative to** the element `width`.',
              examples: [
                {
                  from: [{ translateX: 25 }],
                  title: 'translateX from 25 to -100%',
                  to: [{ translateX: '-100%' }],
                },
              ],
              title: 'X translation',
            },
            {
              description:
                'Translating between pixels and percentages. The percentage value is **relative to** the element `height`.',
              examples: [
                {
                  from: [{ translateY: 25 }],
                  title: 'translateY from 25 to -100%',
                  to: [{ translateY: '-100%' }],
                },
              ],
              title: 'Y translation',
            },
            {
              description: 'Both translations combined.',
              examples: [
                {
                  from: [{ translateX: '-100%' }, { translateY: 25 }],
                  title: 'translateX and translateY',
                  to: [{ translateX: 25 }, { translateY: '-100%' }],
                },
              ],
              title: 'XY translation',
            },
          ],
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
