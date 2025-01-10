import { StyleSheet, View } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, flex, radius, sizes } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

export default function FlexShrink() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <View style={styles.container}>
          <View style={[styles.box]} />
          <Animated.View
            style={[
              styles.box,
              { backgroundColor: colors.primaryDark },
              animation,
            ]}
          />
          <View style={[styles.box]} />
        </View>
      )}
      sections={[
        {
          description: [
            '`flexShrink` is a **continuous** property that allows the child to shrink more or less than the other children within the same parent container.',
            'In all examples below, all boxes have the following properties:',
            ' - **flexShrink**: `1`',
            ' - **flexBasis**: `100%`',
            'The animation that overrides the `flexShrink` value is applied only to the center box.',
          ],
          examples: [
            {
              keyframes: {
                '0%': {
                  flexShrink: 0,
                },
                '100%': {
                  flexShrink: 1,
                },
              },
              title: 'Enlargening',
            },
            {
              keyframes: {
                '0%': {
                  flexShrink: 1,
                },
                '100%': {
                  flexShrink: 2,
                },
              },
              title: 'Shrinking',
            },
          ],
          title: 'Flex Shrink',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    flexBasis: '100%',
    flexShrink: 1,
    height: sizes.md,
    width: sizes.md,
  },
  container: {
    ...flex.center,
    flexDirection: 'row',
    width: 4 * sizes.md,
  },
});
