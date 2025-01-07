import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

export default function FontWeight() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
        animationDuration: '10s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Animated.Text style={[styles.text, animation]}>
          Hello from Reanimated!
        </Animated.Text>
      )}
      tabs={[
        {
          name: 'Keywords',
          sections: [
            {
              examples: [
                {
                  description:
                    "`fontWeight` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
                  keyframes: {
                    '0%, 100%': {
                      fontWeight: 'thin',
                    },
                    '11%': {
                      fontWeight: 'ultralight',
                    },
                    '22%': {
                      fontWeight: 'light',
                    },
                    '33%': {
                      fontWeight: 'normal',
                    },
                    '44%': {
                      fontWeight: 'medium',
                    },
                    '55%': {
                      fontWeight: 'semibold',
                    },
                    '66%': {
                      fontWeight: 'bold',
                    },
                    '77%': {
                      fontWeight: 'heavy',
                    },
                    '88%': {
                      fontWeight: 'black',
                    },
                  },
                  title: 'Changing Font Weight',
                },
              ],
              title: 'Keyword Font Weights',
            },
          ],
        },
        {
          name: 'Numbers',
          sections: [
            {
              examples: [
                {
                  description:
                    "`fontWeight` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
                  keyframes: {
                    '0%, 100%': {
                      fontWeight: '100',
                    },
                    '11%': {
                      fontWeight: '200',
                    },
                    '22%': {
                      fontWeight: '300',
                    },
                    '33%': {
                      fontWeight: '400',
                    },
                    '44%': {
                      fontWeight: '500',
                    },
                    '55%': {
                      fontWeight: '600',
                    },
                    '66%': {
                      fontWeight: '700',
                    },
                    '77%': {
                      fontWeight: '800',
                    },
                    '88%': {
                      fontWeight: '900',
                    },
                  },
                  title: 'Changing Font Weight',
                },
              ],
              title: 'Numeric Font Weights',
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.foreground1,
  },
});
