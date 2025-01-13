import { Platform, StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, radius, spacing } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

export default function TextShadowColor() {
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
            'In this example, the following non-animated text shadow style properties are applied to the box:',
            '• **textShadowRadius**: 10',
            '• **textShadowOffset**: { height: 0, width: 0 }',
            '`textShadowOffset` is necessary to make the shadow visible on iOS.',
            '`elevation` is necessary to make the shadow visible on Android.',
            '`textShadowRadius` is necessary to make the shadow visible on all platforms.',
            '',
            "On **web** other shadow properties than the one you want to animate **aren't inherited** from the element style. That is why you have to set `textShadowRadius` in the animation **keyframes**.",
          ],
          examples: [
            {
              keyframes: Platform.select({
                default: {
                  from: { textShadowColor: 'red' },
                  to: { textShadowColor: 'cyan' },
                },
                web: {
                  from: { textShadowColor: 'red', textShadowRadius: radius.md },
                  to: { textShadowColor: 'cyan', textShadowRadius: radius.md },
                },
              }),
            },
          ],
          title: 'Text Shadow Color',
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
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 10,
  },
});
