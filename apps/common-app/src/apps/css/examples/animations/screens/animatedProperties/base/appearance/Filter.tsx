import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { balloonsImage } from '@/apps/css/assets';
import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import type { LabelType } from '@/apps/css/components/misc';
import { radius, sizes } from '@/theme';

function makeFilterExample(
  title: string,
  from: string,
  to: string,
  labelTypes: Array<LabelType> = ['Android']
) {
  return {
    keyframes: {
      '0%, 100%': { filter: from },
      '50%': { filter: to },
    },
    labelTypes,
    title,
  };
}

const EXAMPLES = [
  makeFilterExample('Brightness', 'brightness(0)', 'brightness(150%)', ['iOS']),
  makeFilterExample('Opacity', 'opacity(1)', 'opacity(0.5)', ['iOS']),
  makeFilterExample('Blur', 'blur(0px)', 'blur(10px)'),
  makeFilterExample('Contrast', 'contrast(100%)', 'contrast(200%)'),
  makeFilterExample(
    'Drop Shadow',
    'dropShadow(0px 0px 0px black)',
    'dropShadow(10px 10px 5px black)'
  ),
  makeFilterExample('Grayscale', 'grayscale(0%)', 'grayscale(100%)'),
  makeFilterExample('Hue Rotate', 'hueRotate(0deg)', 'hueRotate(180deg)'),
  makeFilterExample('Invert', 'invert(0%)', 'invert(100%)'),
  makeFilterExample('Saturate', 'saturate(100%)', 'saturate(300%)'),
  makeFilterExample('Sepia', 'sepia(0%)', 'sepia(100%)'),
];

const STRUCTURE_EXAMPLES = [
  {
    keyframes: {
      '0%, 100%': { filter: 'blur(0px) brightness(0)' },
      '50%': { filter: 'blur(10px) brightness(150%)' },
    },
    title: 'String syntax',
  },
  {
    keyframes: {
      '0%, 100%': { filter: [{ blur: 0 }, { brightness: 0 }] },
      '50%': { filter: [{ blur: 10 }, { brightness: 1.5 }] },
    },
    title: 'Object syntax',
  },
  {
    description:
      'When some filter properties are missing in the keyframes, they will be interpolated to default values.',
    keyframes: {
      '0%, 100%': { filter: [{ blur: 3 }, { brightness: 1.5 }] },
      '50%': { filter: [{ blur: 10 }] },
    },
    title: 'Missing properties',
  },
  {
    description:
      'When fromOperations and toOperations are not compatible (different order or different set of filter functions), the keyframe is considered discrete and the filter will abruptly change between the two states.',
    keyframes: {
      '0%, 100%': {
        filter: [{ blur: 0 }, { opacity: 0.5 }, { brightness: 0.7 }],
      },
      '50%': { filter: [{ blur: 10 }, { brightness: 1.5 }] },
    },
    title: 'Properties not compatible',
  },
];

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
      tabs={[
        {
          name: 'Structure',
          sections: [
            {
              examples: STRUCTURE_EXAMPLES,
              title: 'Filter Structure',
            },
          ],
        },
        {
          name: 'Properties',
          sections: [
            {
              description:
                'These filter properties are supported on all platforms.',
              examples: EXAMPLES.filter((example) =>
                example.labelTypes.includes('iOS')
              ),
              title: 'Filter Properties',
            },
            {
              description:
                'These filter properties are supported only on Android and web platforms.',
              examples: EXAMPLES.filter(
                (example) => !example.labelTypes.includes('iOS')
              ),
              labelTypes: ['Android', 'web'],
              title: 'Filter Properties',
            },
          ],
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
