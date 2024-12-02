import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/components';
import { colors } from '@/theme';

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
                      fontWeight: 'normal',
                    },
                    '9%': {
                      fontWeight: 'ultralight',
                    },
                    '18%': {
                      fontWeight: 'thin',
                    },
                    '27%': {
                      fontWeight: 'light',
                    },
                    '36%': {
                      fontWeight: 'medium',
                    },
                    '45%': {
                      fontWeight: 'regular',
                    },
                    '55%': {
                      fontWeight: 'semibold',
                    },
                    '64%': {
                      fontWeight: 'condensedBold',
                    },
                    '73%': {
                      fontWeight: 'condensed',
                    },
                    '82%': {
                      fontWeight: 'heavy',
                    },
                    '91%': {
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
                    '0%': {
                      fontWeight: '100',
                    },
                    '9%': {
                      fontWeight: '200',
                    },
                    '18%': {
                      fontWeight: '300',
                    },
                    '27%': {
                      fontWeight: '400',
                    },
                    '36%': {
                      fontWeight: '500',
                    },
                    '45%': {
                      fontWeight: '600',
                    },
                    '55%': {
                      fontWeight: '700',
                    },
                    '64%': {
                      fontWeight: '800',
                    },
                    '73%': {
                      fontWeight: '900',
                    },
                    '82%': {
                      fontWeight: '100',
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
