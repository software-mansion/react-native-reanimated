import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationKeyframes,
  CSSAnimationProperties,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes } from '@/theme';
import { ExamplesScreen } from '~/css/components';

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationDirection: 'alternate',
  animationDuration: '1s',
  animationIterationCount: 'infinite',
};

const EXAMPLES = [
  {
    buildKeyframes: ({ property }: { property: string }) => ({
      from: {
        [property]: 0,
      },
      to: {
        [property]: 50,
      },
    }),
    name: 'Absolute',
  },
  {
    buildKeyframes: ({ property }: { property: string }) => ({
      from: {
        [property]: '0%',
      },
      to: {
        [property]: '50%',
      },
    }),
    name: 'Relative',
  },
  {
    buildKeyframes: ({ property }: { property: string }) => ({
      from: {
        [property]: 50,
      },
      to: {
        [property]: '50%',
      },
    }),
    name: 'Mixed',
  },
] satisfies Array<{
  buildKeyframes: ({ property }: { property: string }) => CSSAnimationKeyframes;
  name: string;
}>;

function renderExample({ animation }: { animation: CSSAnimationProperties }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.box, animation]} />
    </View>
  );
}

export default function Insets() {
  return (
    <ExamplesScreen<{ property: string }>
      tabs={EXAMPLES.map(({ buildKeyframes, name }) => ({
        buildAnimation: ({ property }) => ({
          ...SHARED_SETTINGS,
          animationDuration: '3s',
          animationName: buildKeyframes({ property }),
        }),
        name,
        renderExample,
        sections: [
          {
            description:
              'In all examples the box position is set to `absolute`.',
            examples: [
              {
                description: '(or insetBlockStart)',
                property: 'top',
                title: 'Top',
              },
              {
                description: '(or insetBlockEnd)',
                property: 'bottom',
                title: 'Bottom',
              },
              {
                description: '(or insetInlineEnd)',
                property: 'right',
                title: 'Right',
              },
              {
                description: '(or insetInlineStart)',
                property: 'left',
                title: 'Left',
              },
            ],
            title: 'Top / Right / Bottom / Left',
          },
          {
            examples: [
              {
                description:
                  'Applies the same offset value to all `top`, `right`, `bottom`, and `left` properties.',
                property: 'inset',
                title: 'Inset',
              },
              {
                description:
                  'Applies the same offset value to all `top` and `bottom` properties.',
                property: 'insetBlock',
                title: 'Inset Block',
              },
              {
                description:
                  'Applies the same offset value to all `left` and `right` properties.',
                property: 'insetInline',
                title: 'Inset Inline',
              },
            ],
            title: 'Inset Properties',
          },
        ],
      }))}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: sizes.md,
    position: 'absolute',
    width: sizes.md,
  },
});
