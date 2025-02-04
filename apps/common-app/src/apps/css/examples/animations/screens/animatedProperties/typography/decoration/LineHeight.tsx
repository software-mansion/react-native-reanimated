import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors } from '@/theme';

export default function LineHeight() {
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
          Hello from Reanimated! See how the line height changes.
        </Animated.Text>
      )}
      sections={[
        {
          examples: [
            {
              description: [
                '`lineHeight` is a **continuous** property. That means, it **can should be smoothly animated** between values.',
                '',
                'We can see that `lineHeight` animation is choppy on most platforms, so it is not recommended to animate this property.',
              ],
              keyframes: {
                '0%, 100%': {
                  lineHeight: 24,
                },
                '50%': {
                  lineHeight: 32,
                },
              },
              title: 'Changing Line Height',
            },
          ],
          title: 'Line Height',
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
    maxWidth: 300,
  },
});
