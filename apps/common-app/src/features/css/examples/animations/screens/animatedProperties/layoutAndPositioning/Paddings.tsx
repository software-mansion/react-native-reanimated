import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationProperties,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes, spacing } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationDirection: 'alternate',
  animationDuration: '1s',
  animationIterationCount: 'infinite',
};

const SHARED_EXAMPLES = [
  {
    property: 'padding',
    title: 'Padding',
  },
  {
    description: ['(or paddingBlockStart)'],
    property: 'paddingTop',
    title: 'Top Padding',
  },
  {
    description: ['(or paddingEnd / paddingInlineEnd)'],
    property: 'paddingRight',
    title: 'Right Padding',
  },
  {
    description: ['(or paddingBlockEnd)'],
    property: 'paddingBottom',
    title: 'Bottom Padding',
  },
  {
    description: ['(or paddingStart / paddingInlineStart)'],
    property: 'paddingLeft',
    title: 'Left Padding',
  },
  {
    description: ['(or paddingInline)'],
    property: 'paddingHorizontal',
    title: 'Horizontal Padding',
  },
  {
    description: ['(or paddingBlock)'],
    property: 'paddingVertical',
    title: 'Vertical Padding',
  },
];

function renderExample({ animation }: { animation: CSSAnimationProperties }) {
  return (
    <Animated.View style={[styles.box, animation]}>
      <View style={styles.boxInner} />
    </Animated.View>
  );
}

export default function Paddings() {
  return (
    <ExamplesScreen<{ property: string }>
      tabs={[
        {
          buildAnimation: ({ property }) => ({
            animationName: {
              to: {
                [property]: spacing.md,
              },
            },
            ...SHARED_SETTINGS,
          }),
          name: 'Absolute',
          renderExample,
          sections: [
            {
              examples: SHARED_EXAMPLES,
              title: 'Absolute Padding',
            },
          ],
        },
        {
          buildAnimation: ({ property }) => ({
            animationName: {
              to: {
                [property]: '25%',
              },
            },
            ...SHARED_SETTINGS,
          }),
          name: 'Relative',
          renderExample,
          sections: [
            {
              description:
                'All relative paddings are calculated based on the width of the parent element.',
              examples: SHARED_EXAMPLES,
              title: 'Relative Padding',
            },
          ],
        },
        {
          buildAnimation: ({ property }) => ({
            animationDuration: '3s',
            animationIterationCount: 'infinite',
            animationName: {
              '0%, 100%': {
                [property]: 0,
              },
              '25%': {
                [property]: '5%',
              },
              '50%': {
                [property]: spacing.xxs,
              },
              '75%': {
                [property]: '20%',
              },
            },
          }),
          name: 'Mixed',
          renderExample,
          sections: [
            {
              CardComponent: VerticalExampleCard,
              examples: [
                {
                  property: 'padding',
                  title: 'Mixed Padding',
                },
              ],
              title: 'Mixed Padding',
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    height: sizes.lg,
    width: sizes.lg,
  },
  boxInner: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: '100%',
    width: '100%',
  },
});
