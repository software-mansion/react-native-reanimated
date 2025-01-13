import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

export default function TextTransform() {
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
                "`textTransform` is a **discrete** property. That means, it **can't be smoothly animated** between values.",
              keyframes: {
                '0%, 100%': {
                  textTransform: 'none',
                },
                '25%': {
                  textTransform: 'uppercase',
                },
                '50%': {
                  textTransform: 'lowercase',
                },
                '75%': {
                  textTransform: 'capitalize',
                },
              },
              title: 'Changing Text Transform',
            },
          ],
          title: 'Text Transform',
        },
      ]}
    />
  );
}
const styles = StyleSheet.create({
  text: {
    color: colors.foreground1,
    fontFamily: 'Poppins',
    textAlign: 'center',
    width: '100%',
  },
});
