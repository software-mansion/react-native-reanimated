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
                "`textDecorationStyle` is a **discrete** property. That means, it **can't be smoothly animated** between values.",
              keyframes: {
                '0%, 100%': {
                  textDecorationStyle: 'solid',
                },
                '25%': {
                  textDecorationStyle: 'dotted',
                },
                '50%': {
                  textDecorationStyle: 'dashed',
                },
                '75%': {
                  textDecorationStyle: 'dotted',
                },
              },
              title: 'Changing Text Decoration Style',
            },
          ],

          labelTypes: ['iOS', 'web'],
          title: 'Text Decoration Style',
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
