import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

export default function FontFamily() {
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
                "`fontFamily` is a **discrete** property. That means, it **can't be smoothly animated** between values.",
              keyframes: {
                from: {
                  fontFamily: 'Poppins',
                },
                to: {
                  fontFamily: 'Arial',
                },
              },
              title: 'Changing Font Family',
            },
          ],
          title: 'Font Family',
        },
      ]}
    />
  );
}
const styles = StyleSheet.create({
  text: {
    color: colors.foreground1,
    fontSize: 24,
  },
});
