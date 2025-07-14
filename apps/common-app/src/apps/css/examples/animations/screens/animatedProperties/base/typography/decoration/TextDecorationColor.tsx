import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors } from '@/theme';

export default function TextDecorationStyle() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
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
                '`textDecorationColor` is a **continuous** property. That means, it **can be smoothly animated** between values.',
              keyframes: {
                from: {
                  textDecorationColor: 'red',
                },
                to: {
                  textDecorationColor: 'cyan',
                },
              },
              title: 'Changing Text Decoration Color',
            },
          ],

          labelTypes: ['iOS', 'web'],
          title: 'Text Decoration Color',
        },
      ]}
    />
  );
}
const styles = StyleSheet.create({
  text: {
    color: colors.foreground1,
    fontSize: 20,
    textDecorationLine: 'underline',
  },
});
