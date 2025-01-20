import { Platform, StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';

export default function ShadowRadius() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[styles.box, animation]} />
      )}
      sections={[
        {
          description: [
            'In this example, the following non-animated shadow style properties are applied to the box:',
            `• **shadowColor**: ${colors.primaryDark}`,
            '• **shadowOpacity**: 1',
            '`shadowOpacity` is necessary to make the shadow visible on iOS.',
            '',
            "On **web** other shadow properties than the one you want to animate **aren't inherited** from the element style. That is why you have to set `shadowColor` in the animation **keyframes** if you want to use a custom `shadowColor`.",
          ],
          examples: [
            {
              keyframes: Platform.select({
                default: {
                  from: { shadowRadius: 5 },
                  to: { shadowRadius: 25 },
                },
                web: {
                  from: { shadowColor: colors.primaryDark, shadowRadius: 5 },
                  to: { shadowColor: colors.primaryDark, shadowRadius: 25 },
                },
              }),
            },
          ],
          labelTypes: ['iOS', 'web'],
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
