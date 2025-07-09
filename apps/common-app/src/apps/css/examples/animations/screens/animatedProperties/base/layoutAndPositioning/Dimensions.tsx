import type { DimensionValue } from 'react-native';
import { StyleSheet } from 'react-native';
import type { CSSAnimationSettings } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationDirection: 'alternate',
  animationDuration: '1s',
  animationIterationCount: 'infinite',
};

const SECTIONS = [
  {
    examples: [
      {
        property: 'width',
        title: 'Width',
      },
      {
        description: 'When width is set to 75',
        property: 'minWidth',
        title: 'Min Width',
        width: 75,
      },
      {
        description: 'When width is set to 75',
        property: 'maxWidth',
        title: 'Max Width',
        width: 75,
      },
    ],
    title: 'Width',
  },
  {
    examples: [
      {
        property: 'height',
        title: 'Height',
      },
      {
        description: 'When height is set to 75',
        height: 75,
        property: 'minHeight',
        title: 'Min Height',
      },
      {
        description: 'When height is set to 75',
        height: 75,
        property: 'maxHeight',
        title: 'Max Height',
      },
    ],
    title: 'Height',
  },
];

export default function Dimensions() {
  return (
    <ExamplesScreen<{
      property: string;
      width?: DimensionValue;
      height?: DimensionValue;
    }>
      renderExample={({ animation, height = sizes.md, width = sizes.md }) => (
        <Animated.View style={[styles.box, animation, { height, width }]} />
      )}
      tabs={[
        {
          buildAnimation: ({ property }) => ({
            ...SHARED_SETTINGS,
            animationName: {
              from: {
                [property]: 50,
              },
              to: {
                [property]: 100,
              },
            },
          }),
          name: 'Absolute',
          sections: SECTIONS,
        },
        {
          buildAnimation: ({ property }) => ({
            ...SHARED_SETTINGS,
            animationName: {
              from: {
                [property]: '25%',
              },
              to: {
                [property]: '75%',
              },
            },
          }),
          name: 'Relative',
          sections: SECTIONS,
        },
        {
          buildAnimation: ({ property }) => ({
            animationDuration: '3s',
            animationIterationCount: 'infinite',
            animationName: {
              '0%, 100%': {
                [property]: 25,
              },
              '25%': {
                [property]: '75%',
              },
              '50%': {
                [property]: 50,
              },
              '75%': {
                [property]: '25%',
              },
            },
          }),
          name: 'Mixed',
          sections: [
            {
              CardComponent: VerticalExampleCard,
              examples: [
                {
                  property: 'width',
                  title: 'Width',
                },
              ],
              title: 'Width',
            },
            {
              examples: [
                {
                  collapsedExampleHeight: 300,
                  property: 'height',
                  title: 'Height',
                },
              ],
              title: 'Height',
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
});
