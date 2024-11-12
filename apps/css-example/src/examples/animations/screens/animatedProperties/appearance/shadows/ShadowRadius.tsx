import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/components';
import { colors, radius, sizes } from '@/theme';

export default function ShadowRadius() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildConfig={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
      })}
      renderExample={({ config }) => (
        <Animated.View style={[styles.box, config]} />
      )}
      sections={[
        {
          description: [
            'In this example, the following non-animated shadow style properties are applied to the box:',
            `• **shadowColor**: ${colors.primaryDark}`,
            '• **shadowOpacity**: 1',
            '`shadowOpacity` is necessary to make the shadow visible.',
          ],
          examples: [
            {
              keyframes: {
                from: { shadowRadius: 5 },
                to: { shadowRadius: 25 },
              },
            },
          ],
          labelTypes: ['iOS'],
          title: 'Shadow Radius',
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
    shadowColor: colors.primaryDark,
    shadowOpacity: 1,
    width: sizes.md,
  },
});
