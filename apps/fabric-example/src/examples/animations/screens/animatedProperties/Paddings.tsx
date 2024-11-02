import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/components';
import { colors, radius, sizes, spacing } from '@/theme';

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
    property: 'paddingTop',
    title: 'Top Padding',
  },
  {
    description: '(or paddingEnd)',
    property: 'paddingRight',
    title: 'Right Padding',
  },
  {
    property: 'paddingBottom',
    title: 'Bottom Padding',
  },
  {
    description: '(or paddingStart)',
    property: 'paddingLeft',
    title: 'Left Padding',
  },
  {
    property: 'paddingHorizontal',
    title: 'Horizontal Padding',
  },
  {
    property: 'paddingVertical',
    title: 'Vertical Padding',
  },
];

function renderExample({ config }: { config: CSSAnimationConfig }) {
  return (
    <Animated.View style={[styles.box, config]}>
      <View style={styles.boxInner} />
    </Animated.View>
  );
}

export default function Paddings() {
  return (
    <ExamplesScreen<{ property: string }>
      tabs={[
        {
          buildConfig: ({ property }) => ({
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
          buildConfig: ({ property }) => ({
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
          buildConfig: ({ property }) => ({
            animationDuration: '3s',
            animationIterationCount: 'infinite',
            animationName: {
              '0%': {
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
              '100%': {
                [property]: 0,
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
