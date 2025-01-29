import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors } from '@/theme';

export default function IncludeFontPadding() {
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
                "`textAlignVertical` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
              keyframes: {
                from: {
                  includeFontPadding: true,
                },
                to: {
                  includeFontPadding: false,
                },
              },
              title: 'Changing Include Font Padding',
            },
          ],
          labelTypes: ['Android'],
          title: 'Include Font Padding',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    backgroundColor: colors.primaryLight,
    color: colors.primaryDark,
    fontFamily: 'Poppins',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
