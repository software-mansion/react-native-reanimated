import { Platform, StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';

export default function ShadowOpacity() {
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
            '• **shadowRadius**: 10',
            '`shadowRadius` is necessary to make the shadow visible.',
            '',
            "On **web** other shadow properties than the one you want to animate **aren't inherited** from the element style. That is why you have to set `shadowColor` and `shadowRadius` in the animation **keyframes** if you want to use a custom `shadowColor` and `shadowRadius`.",
          ],
          examples: [
            {
              keyframes: Platform.select({
                default: {
                  from: { shadowOpacity: 0 },
                  to: { shadowOpacity: 1 },
                },
                web: {
                  from: {
                    shadowColor: colors.primaryDark,
                    shadowOpacity: 0,
                    shadowRadius: 10,
                  },
                  to: {
                    shadowColor: colors.primaryDark,
                    shadowOpacity: 1,
                    shadowRadius: 10,
                  },
                },
              }),
            },
          ],
          labelTypes: ['iOS', 'web'],
          title: 'Shadow Opacity',
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
    shadowRadius: 10,
    width: sizes.md,
  },
});
