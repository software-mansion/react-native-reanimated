// TODO - check if this prop works in React Native (it seems that the result is always the same,
// irrespective of the value of the borderCurve prop)
import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/components';
import { colors, radius, sizes, spacing } from '@/theme';

export default function BorderCurve() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildConfig={({ keyframes }) => ({
        animationDuration: '2s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ config }) => (
        <Animated.View style={[styles.box, config]} />
      )}
      sections={[
        {
          examples: [
            {
              description:
                "`borderCurve` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
              keyframes: {
                '0%, 100%': {
                  borderCurve: 'circular',
                },
                '50%': {
                  borderCurve: 'continuous',
                },
              },
              title: 'Changing Border Curve',
            },
          ],
          labelTypes: ['iOS'],
          title: 'Border Curve',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    borderRadius: radius.sm,
    borderRightWidth: spacing.md,
    borderTopWidth: spacing.md,
    height: sizes.xl,
    width: sizes.xl,
  },
});
