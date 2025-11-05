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
                "`userSelect` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
              keyframes: {
                from: {
                  userSelect: 'none',
                },
                to: {
                  userSelect: 'auto',
                },
              },
              title: 'Changing User Select',
            },
          ],
          labelTypes: ['web'],
          title: 'User Select',
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
