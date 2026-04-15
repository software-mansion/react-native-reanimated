import { StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, flex, sizes } from '@/theme';
import type { Transforms } from '@/types';

export default function Perspective() {
  return (
    <ExamplesScreen<{ from: Transforms; to: Transforms; num: number }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ from, to }) => ({
        animationDirection: 'alternate',
        animationDuration: '3s',
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
      renderExample={({ animation, num }) => (
        <Animated.View style={[styles.box, animation]}>
          <Text style={styles.number}>{num}</Text>
        </Animated.View>
      )}
      sections={[
        {
          description:
            'Perspective is applied only to transformations listed after it in the `transform` property array. It is used to give **depth** in the **3D transformations**.',
          examples: [
            {
              from: [{ perspective: 10 }, { rotateX: '15deg' }],
              num: 21,
              title: 'With X rotation',
              to: [{ perspective: 50 }, { rotateX: '15deg' }],
            },
            {
              from: [{ perspective: 20 }, { rotateY: '30deg' }],
              num: 37,
              title: 'With Y rotation',
              to: [{ perspective: 100 }, { rotateY: '30deg' }],
            },
          ],
          title: 'Positive Perspective',
        },
        {
          description:
            'Perspective interpolates even when it is specified in only one keyframe. This example shows how the animation behaves when perspective is added on the destination keyframe only.',
          examples: [
            {
              from: [{ rotateY: '30deg' }],
              num: 73,
              title: 'With Y rotation',
              to: [{ perspective: 25 }, { rotateY: '30deg' }],
            },
          ],
          title: 'Single-keyframe perspective',
        },
        {
          description:
            'Negative perspective values are allowed (not on the **web**). They **invert** the view transformation relative to the **transformation origin** (e.g. invert the rotation direction).',
          examples: [
            {
              description: 'Perspective is between 20 and -100',
              from: [{ perspective: 20 }, { rotateY: '30deg' }],
              num: 12,
              title: 'With Y rotation',
              to: [{ perspective: -100 }, { rotateY: '30deg' }],
            },
          ],
          labelTypes: ['iOS', 'Android'],
          title: 'Negative Perspective',
        },
        {
          description: 'Perspective can also be used in transform strings.',
          examples: [
            {
              from: 'perspective(10px) rotate(5deg) rotateX(15deg)',
              num: 55,
              title: 'With X and Z rotations',
              to: 'perspective(100px) rotate(45deg) rotateX(15deg)',
            },
          ],
          title: 'Transform string',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    ...flex.center,
    backgroundColor: colors.primary,
    height: sizes.lg,
    width: sizes.lg,
  },
  number: {
    color: colors.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
});
