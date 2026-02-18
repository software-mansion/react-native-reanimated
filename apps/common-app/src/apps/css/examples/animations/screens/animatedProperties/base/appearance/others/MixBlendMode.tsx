import { StyleSheet, View } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { balloonsImage } from '@/apps/css/assets';
import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';

export default function MixBlendMode() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '14s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <View>
          <View style={styles.box} />
          <Animated.Image
            source={balloonsImage}
            style={[styles.image, animation]}
          />
        </View>
      )}
      sections={[
        {
          examples: [
            {
              description:
                '`mix-blend-mode` is a **continuous** property. That means, it **can be smoothly animated** between values.',
              keyframes: {
                '0%, 100%': {
                  mixBlendMode: 'normal',
                },
                '13.33%': {
                  mixBlendMode: 'screen',
                },
                '20%': {
                  mixBlendMode: 'overlay',
                },
                '26.67%': {
                  mixBlendMode: 'darken',
                },
                '33.33%': {
                  mixBlendMode: 'lighten',
                },
                '40%': {
                  mixBlendMode: 'color-dodge',
                },
                '46.67%': {
                  mixBlendMode: 'color-burn',
                },
                '53.33%': {
                  mixBlendMode: 'hard-light',
                },
                '6.67%': {
                  mixBlendMode: 'multiply',
                },
                '60%': {
                  mixBlendMode: 'soft-light',
                },
                '66.67%': {
                  mixBlendMode: 'difference',
                },
                '73.33%': {
                  mixBlendMode: 'exclusion',
                },
                '80%': {
                  mixBlendMode: 'hue',
                },
                '86.67%': {
                  mixBlendMode: 'saturation',
                },
                '93.33%': {
                  mixBlendMode: 'color',
                },
                // eslint-disable-next-line perfectionist/sort-objects
                '100%': {
                  mixBlendMode: 'luminosity',
                },
              },
              minExampleHeight: 1.5 * sizes.xxxl,
              title: 'Changing Mix Blend Mode',
            },
          ],
          title: 'Mix Blend Mode',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: sizes.xxxl,
    position: 'absolute',
    transform: [{ translateX: '-15%' }, { translateY: '-15%' }],
    width: sizes.xxxl,
  },
  image: {
    borderRadius: radius.md,
    height: sizes.xxxl,
    width: sizes.xxxl,
  },
});
