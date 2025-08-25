import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';

export default function Cursor() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
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
              description: [
                "`cursor` is a **discrete** property. That means, it **can't be smoothly animated** between values.",
                '',
                '**Hover** the mouse cursor **over the text** to see the animation.',
                'On **mobile device** you will need to **connect a mouse** to see the animation.',
              ],
              keyframes: {
                from: {
                  cursor: 'auto',
                },
                to: {
                  cursor: 'pointer',
                },
              },
              title: 'Changing Cursor',
            },
          ],
          title: 'Cursor',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: 'Poppins',
    fontSize: 24,
  },
});
