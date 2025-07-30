import { Platform, StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';

export default function ShadowOffset() {
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
            '• **shadowRadius**: 5',
            '`shadowOpacity` is necessary to make the shadow visible on iOS.',
            '',
            "On **web** other shadow properties than the one you want to animate **aren't inherited** from the element style. That is why you have to set `shadowColor` and `shadowRadius` in the animation **keyframes** if you want to use a custom `shadowColor` and `shadowRadius`.",
          ],
          examples: [
            {
              keyframes: Platform.select({
                default: {
                  from: { shadowOffset: { height: 0, width: 0 } },
                  to: { shadowOffset: { height: 25, width: 25 } },
                },
                web: {
                  from: {
                    shadowColor: colors.primaryDark,
                    shadowOffset: { height: 0, width: 0 },
                    shadowRadius: 5,
                  },
                  to: {
                    shadowColor: colors.primaryDark,
                    shadowOffset: { height: 25, width: 25 },
                    shadowRadius: 5,
                  },
                },
              }),
            },
          ],
          labelTypes: ['iOS', 'web'],
          title: 'Shadow Offset',
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
    shadowRadius: 5,
    width: sizes.md,
  },
});
