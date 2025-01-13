import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

export default function TextDecorationLine() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
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
                "`textDecorationLine` is a **discrete** property. That means, it **can't be smoothly animated** between values.",
              keyframes: {
                '0%, 100%': {
                  textDecorationLine: 'none',
                },
                '25%': {
                  textDecorationLine: 'underline',
                },
                '50%': {
                  textDecorationLine: 'line-through',
                },
                '75%': {
                  textDecorationLine: 'underline line-through',
                },
              },
              title: 'Changing Text Decoration Line',
            },
          ],
          title: 'Text Decoration Line',
        },
      ]}
    />
  );
}
const styles = StyleSheet.create({
  text: {
    color: colors.foreground1,
    fontFamily: 'Poppins',
    fontSize: 20,
  },
});
