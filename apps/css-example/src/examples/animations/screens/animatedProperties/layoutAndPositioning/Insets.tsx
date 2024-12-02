import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationProperties,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen } from '@/components';
import { colors, radius, sizes } from '@/theme';

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationDirection: 'alternate',
  animationDuration: '1s',
  animationIterationCount: 'infinite',
};

const EXAMPLES = [
  {
    property: 'top',
    title: 'Top',
  },
  {
    property: 'right',
    title: 'Right',
  },
  {
    property: 'bottom',
    title: 'Bottom',
  },
  {
    property: 'left',
    title: 'Left',
  },
];

const DESCRIPTION = 'In all examples the box position is set to `absolute`.';

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
      tabs={[
        {
          buildAnimation: ({ property }) => ({
            ...SHARED_SETTINGS,
            animationName: {
              from: {
                [property]: 0,
              },
              to: {
                [property]: 50,
              },
            },
          }),
          name: 'Absolute',
          renderExample,
          sections: [
            {
              description: DESCRIPTION,
              examples: EXAMPLES,
              title: 'Absolute Insets',
            },
          ],
        },
        {
          buildAnimation: ({ property }) => ({
            ...SHARED_SETTINGS,
            animationName: {
              from: {
                [property]: '0%',
              },
              to: {
                [property]: '50%',
              },
            },
          }),
          name: 'Relative',
          renderExample,
          sections: [
            {
              description: DESCRIPTION,
              examples: EXAMPLES,
              title: 'Relative Insets',
            },
          ],
        },
        {
          buildAnimation: ({ property }) => ({
            ...SHARED_SETTINGS,
            animationName: {
              '0%, 100%': {
                [property]: 0,
              },
              '25%': {
                [property]: '25%',
              },
              '50%': {
                [property]: 50,
              },
              '75%': {
                [property]: '50%',
              },
            },
          }),
          name: 'Mixed',
          renderExample,
          sections: [
            {
              description: DESCRIPTION,
              examples: EXAMPLES,
              title: 'Mixed Insets',
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
    borderRadius: radius.md,
    height: sizes.md,
    position: 'absolute',
    width: sizes.md,
  },
});
