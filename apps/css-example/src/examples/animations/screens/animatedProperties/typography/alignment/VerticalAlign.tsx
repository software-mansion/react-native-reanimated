import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/components';
import { colors } from '@/theme';

export default function VerticalAlign() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildConfig={({ keyframes }) => ({
        animationDuration: '3s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ config }) => (
        <Animated.Text style={[styles.text, config]}>
          Hello from Reanimated!
        </Animated.Text>
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
          labelTypes: ['Android'],
          title: 'Vertical Align',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.primary,
    fontFamily: 'Poppins',
    fontSize: 16,
    fontWeight: 'bold',
    height: 100,
  },
});
