import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/components';
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
        <Animated.View
          style={[styles.box, animation, { shadowOffset: undefined }]}
        />
      )}
      sections={[
        {
          description: [
            'In this example, the following non-animated shadow style properties are applied to the box:',
            `• **shadowColor**: ${colors.primaryDark}`,
            '• **shadowOpacity**: 1',
            '• **shadowRadius**: 5',
            '`shadowOpacity` and `shadowRadius` are necessary to make the shadow visible.',
          ],
          examples: [
            {
              keyframes: {
                from: { shadowOffset: { height: 0, width: 0 } },
                to: { shadowOffset: { height: 25, width: 25 } },
              },
            },
          ],
          labelTypes: ['iOS'],
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
