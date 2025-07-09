import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors } from '@/theme';

export default function LetterSpacing() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '3s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Animated.Text style={[styles.text, animation]}>
          Hello from Reanimated!
        </Animated.Text>
      )}
      sections={[
        {
          examples: [
            {
              description:
                '`letterSpacing` is a **continuous** property. That means, it **can be smoothly animated** between values.',
              keyframes: {
                '0%, 100%': {
                  letterSpacing: 0,
                },
                '50%': {
                  letterSpacing: 5,
                },
              },
              title: 'Changing Letter Spacing',
            },
          ],
          title: 'Letter Spacing',
        },
      ]}
    />
  );
}
const styles = StyleSheet.create({
  text: {
    color: colors.foreground1,
    fontFamily: 'Poppins',
    fontSize: 16,
  },
});
