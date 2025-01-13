import { Platform, StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

export default function ShadowColor() {
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
            '• **shadowOpacity**: 1',
            '• **elevation**: 12',
            '`shadowOpacity` is necessary to make the shadow visible on iOS.',
            '`elevation` is necessary to make the shadow visible on Android.',
            '',
            "On **web** other shadow properties than the one you want to animate **aren't inherited** from the element style. That is why you have to set `shadowRadius` in the animation **keyframes**.",
          ],
          examples: [
            {
              keyframes: Platform.select({
                default: {
                  from: { shadowColor: 'red' },
                  to: { shadowColor: 'cyan' },
                },
                web: {
                  from: { shadowColor: 'red', shadowRadius: radius.md },
                  to: { shadowColor: 'cyan', shadowRadius: radius.md },
                },
              }),
            },
          ],
          title: 'Shadow Color',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    elevation: radius.md,
    height: sizes.md,
    shadowOpacity: 1,
    width: sizes.md,
  },
});
