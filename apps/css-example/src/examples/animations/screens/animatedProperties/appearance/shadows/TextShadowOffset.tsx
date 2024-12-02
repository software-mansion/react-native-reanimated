import { Platform, StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/components';
import { colors, spacing } from '@/theme';

export default function TextShadowOffset() {
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
        <Animated.Text
          style={[
            styles.text,
            animation,
            Platform.select({
              android: {
                ...StyleSheet.absoluteFillObject,
                textAlign: 'center',
                textAlignVertical: 'center',
              },
              ios: {
                padding: spacing.xl,
              },
            }),
          ]}>
          CSS
        </Animated.Text>
      )}
      sections={[
        {
          description: [
            'In this example, the following non-animated text shadow style properties are applied to the text:',
            `• **textShadowColor**: ${colors.primaryDark}`,
            '• **textShadowRadius**: 10',
            '`textShadowRadius` is necessary to make the shadow visible.',
            'iOS requires also `textShadowColor` and `textShadowRadius` to be set.',
          ],
          examples: [
            {
              keyframes: {
                from: { textShadowOffset: { height: 0, width: 0 } },
                to: { textShadowOffset: { height: 25, width: 25 } },
              },
            },
          ],
          title: 'Text Shadow Offset',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.primary,
    fontSize: 36,
    fontWeight: 'bold',
    textShadowColor: colors.primaryDark,
    textShadowRadius: 10,
  },
});
