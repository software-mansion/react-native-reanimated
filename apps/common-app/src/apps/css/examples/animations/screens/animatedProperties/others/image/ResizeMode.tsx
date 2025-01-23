import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { balloonsImage } from '@/apps/css/assets';
import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';

export default function ResizeMode() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '3s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Animated.Image
          source={balloonsImage}
          style={[styles.image, animation]}
        />
      )}
      sections={[
        {
          examples: [
            {
              description:
                "`resizeMode` is a **discrete** property. That means, it **can't be smoothly animated** between values.",
              keyframes: {
                '0%, 100%': {
                  resizeMode: 'contain',
                },
                '25%': {
                  resizeMode: 'cover',
                },
                '50%': {
                  resizeMode: 'stretch',
                },
                '75%': {
                  resizeMode: 'center',
                },
              },
              title: 'Changing Resize Mode',
            },
          ],
          labelTypes: ['iOS', 'Android'],
          title: 'Resize Mode',
        },
      ]}
    />
  );
}
const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    height: sizes.xxxl,
    width: sizes.xxxl,
  },
});
