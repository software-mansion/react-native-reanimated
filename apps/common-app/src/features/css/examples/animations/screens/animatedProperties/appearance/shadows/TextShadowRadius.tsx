import { Platform, StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, spacing } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

export default function TextShadowRadius() {
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
            `• **textShadowOffset**: { height: 0, width: 0 }`,
            'iOS requires `textShadowColor` and `textShadowRadius` to be set.',
            '',
            "On **web** other shadow properties than the one you want to animate **aren't inherited** from the element style. That is why you have to set `shadowColor` and `shadowRadius` in the animation **keyframes** if you want to use a custom `shadowColor` and `shadowRadius`.",
          ],
          examples: [
            {
              keyframes: Platform.select({
                default: {
                  from: { textShadowRadius: 5 },
                  to: { textShadowRadius: 25 },
                },
                web: {
                  from: {
                    textShadowColor: colors.primaryDark,
                    textShadowRadius: 5,
                  },
                  to: {
                    textShadowColor: colors.primaryDark,
                    textShadowRadius: 25,
                  },
                },
              }),
            },
          ],
          title: 'Text Shadow Radius',
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
    textShadowOffset: { height: 0, width: 0 },
  },
});
