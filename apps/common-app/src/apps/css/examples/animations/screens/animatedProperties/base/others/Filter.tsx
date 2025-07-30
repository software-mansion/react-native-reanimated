import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { balloonsImage } from '@/apps/css/assets';
import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { radius, sizes } from '@/theme';

export default function Filter() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
        animationDuration: '5s',
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
          description: [
            'Most of `filter` properties are **continuous**. That means, they **can be smoothly animated** between values.',
          ],
          examples: [
            {
              keyframes: {
                '0%, 100%': {
                  filter: 'blur(0px) brightness(0)',
                },
                '50%': {
                  filter: 'blur(10px) brightness(150%)',
                },
              },
              title: 'String syntax',
            },
            {
              keyframes: {
                '0%, 100%': {
                  filter: [{ blur: 0, brightness: 0 }],
                },
                '50%': {
                  filter: [{ blur: 10, brightness: 150 }],
                },
              },
              title: 'Object syntax',
            },
          ],
          labelTypes: ['web'],
          title: 'Filter',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: radius.md,
    height: sizes.xxl,
    width: sizes.xxl,
  },
});
