import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors } from '@/theme';
import { ExamplesScreen, Text, VerticalExampleCard } from '~/css/components';

export default function VerticalAlign() {
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
        <Text style={styles.outerText}>
          Hello from
          <Animated.Text style={[styles.innerText, animation]}>
            {' '}
            Reanimated!
          </Animated.Text>
        </Text>
      )}
      sections={[
        {
          examples: [
            {
              description:
                "`verticalAlign` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
              keyframes: {
                '0%, 100%': {
                  verticalAlign: 'top',
                },
                '33.3%': {
                  verticalAlign: 'bottom',
                },
                '66.6%': {
                  verticalAlign: 'middle',
                },
              },
              title: 'Changing Vertical Alignment',
            },
          ],
          labelTypes: ['web'],
          title: 'Vertical Align',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  innerText: {
    fontSize: 10,
    lineHeight: 10,
  },
  outerText: {
    color: colors.primary,
    fontFamily: 'Poppins',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 48,
  },
});
