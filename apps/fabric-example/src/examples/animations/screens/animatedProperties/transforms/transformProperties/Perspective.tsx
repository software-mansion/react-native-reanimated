import { StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/components';
import { colors, flex, sizes } from '@/theme';
import type { Transforms } from '@/types';

export default function Perspective() {
  return (
    <ExamplesScreen<{ from: Transforms; to: Transforms; num: number }>
      CardComponent={VerticalExampleCard}
      buildConfig={({ from, to }) => ({
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
      renderExample={({ config, num }) => (
        <Animated.View style={[styles.box, config]}>
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
            'The **default perspective** value is **0**, which means that there is no perspective applied. If you want to animate perspective, **make sure to set a value greater than 0 in all keyframes**. The example below shows that the perspective **is not animated** when not explicitly set to the perspective value.',
          examples: [
            {
              from: [{ rotateY: '30deg' }],
              num: 73,
              title: 'Without perspective',
              to: [{ perspective: 100 }, { rotateY: '30deg' }],
            },
          ],
          title: 'Zero Perspective',
        },
        {
          description:
            'Negative perspective values are allowed. They **invert** the view transformation relative to the **transformation origin** (e.g. invert the rotation direction).',
          examples: [
            {
              from: [{ perspective: -20 }, { rotateY: '30deg' }],
              num: 12,
              title: 'With X rotation',
              to: [{ perspective: -100 }, { rotateY: '30deg' }],
            },
          ],
          title: 'Negative Perspective',
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
