import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/components';
import { colors } from '@/theme';

export default function TextAlign() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
        animationDuration: '4s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <>
          <Animated.Text style={[styles.heading, animation]}>
            Hello from Reanimated!
          </Animated.Text>
          <Animated.Text style={[styles.body, animation]}>
            Lorem ipsum fugiat culpa minim consequat eu exercitation est
            pariatur tempor magna. Ad ad fugiat eiusmod magna magna enim eu
            amet.
          </Animated.Text>
        </>
      )}
      sections={[
        {
          examples: [
            {
              description:
                "`textAlign` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
              keyframes: {
                '0%, 100%': {
                  textAlign: 'left',
                },
                '25%': {
                  textAlign: 'right',
                },
                '50%': {
                  textAlign: 'center',
                },
                '75%': {
                  textAlign: 'justify',
                },
              },
              title: 'Changing Text Alignment',
            },
          ],
          title: 'Text Align',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.foreground1,
    fontFamily: 'Poppins',
    fontSize: 12,
    width: '100%',
  },
  heading: {
    color: colors.primary,
    fontFamily: 'Poppins',
    fontSize: 16,
    fontWeight: 'bold',
    width: '100%',
  },
});
