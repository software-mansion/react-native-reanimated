import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors } from '@/theme';
import { IS_ANDROID } from '@/utils';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

export default function FontVariant() {
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
                "`fontVariant` is a **discrete** property. That means, it **can't be smoothly animated** between values.",
              keyframes: {
                to: {
                  fontVariant: ['small-caps'],
                },
              },
              title: 'Changing Font Variant',
            },
          ],
          title: 'Font Variant',
        },
      ]}
    />
  );
}
const styles = StyleSheet.create({
  text: {
    color: colors.foreground1,
    fontFamily: IS_ANDROID ? 'Arial' : 'System',
  },
});
