import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationKeyframes,
  CSSAnimationProperties,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationDirection: 'alternate',
  animationDuration: '1s',
  animationIterationCount: 'infinite',
};

const EXAMPLES = [
  {
    containerStyle: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    description:
      'Parent container with `alignItems: center` and `justifyContent: center`',
    property: 'margin',
    title: 'Margin',
  },
  {
    containerStyle: {
      justifyContent: 'center',
    },
    description: [
      '(or marginBlockStart)',
      'Parent container with `justifyContent: center`',
    ],
    property: 'marginTop',
    title: 'Top Margin',
  },
  {
    containerStyle: {
      justifyContent: 'center',
    },
    description: [
      '(or marginEnd / marginInlineEnd)',
      'Parent container with `justifyContent: center`',
    ],
    property: 'marginRight',
    title: 'Right Margin',
  },
  {
    containerStyle: {
      justifyContent: 'center',
    },
    description: [
      '(or marginBlockEnd)',
      'Parent container with `justifyContent: center`',
    ],
    property: 'marginBottom',
    title: 'Bottom Margin',
  },
  {
    containerStyle: {
      justifyContent: 'center',
    },
    description: [
      '(or marginStart / marginInlineStart)',
      'Parent container with `justifyContent: center`',
    ],
    property: 'marginLeft',
    title: 'Left Margin',
  },
  {
    containerStyle: {
      justifyContent: 'center',
    },
    description: [
      '(or marginInline)',
      'Parent container with `justifyContent: center`',
    ],
    property: 'marginHorizontal',
    title: 'Horizontal Margin',
  },
  {
    containerStyle: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    description: [
      '(or marginBlock)',
      'Parent container with `alignItems: center` and `justifyContent: center`',
    ],
    property: 'marginVertical',
    title: 'Vertical Margin',
  },
] satisfies Array<{
  property?: string;
  containerStyle?: ViewStyle;
  description: Array<string> | string;
  title: string;
}>;

const renderExample = ({
  animation,
  containerStyle,
}: {
  animation: CSSAnimationProperties;
  containerStyle?: ViewStyle;
}) => (
  <View style={[styles.container, containerStyle]}>
    {Array.from({ length: 9 }).map((_, index) => {
      if (index === 4) {
        return (
          <Animated.View
            key={index}
            style={[styles.box, animation, styles.animatedBox]}
          />
        );
      }
      return <View key={index} style={styles.box} />;
    })}
  </View>
);

export default function Margins() {
  return (
    <ExamplesScreen<{
      property?: string;
      keyframes?: CSSAnimationKeyframes;
      containerStyle?: ViewStyle;
    }>
      renderExample={renderExample}
      tabs={[
        {
          buildAnimation: ({ property }) => ({
            ...SHARED_SETTINGS,
            animationName: {
              to: {
                [property!]: spacing.sm,
              },
            },
          }),
          name: 'Absolute',
          sections: [
            {
              examples: EXAMPLES,
              title: 'Absolute Margins',
            },
          ],
        },
        {
          buildAnimation: ({ property }) => ({
            ...SHARED_SETTINGS,
            animationName: {
              from: {
                [property!]: '0%',
              },
              to: {
                [property!]: '10%',
              },
            },
          }),
          name: 'Relative',
          sections: [
            {
              examples: EXAMPLES,
              title: 'Relative Margins',
            },
          ],
        },
        {
          buildAnimation: ({ keyframes }) => ({
            ...SHARED_SETTINGS,
            animationName: keyframes!,
          }),
          CardComponent: VerticalExampleCard,
          name: 'Mixed',
          sections: [
            {
              examples: [
                {
                  containerStyle: flex.center,
                  description:
                    'Parent container with `alignItems: center` and `justifyContent: center`',
                  keyframes: {
                    from: {
                      margin: spacing.xxs,
                    },
                    to: {
                      margin: '10%',
                    },
                  },
                  title: 'Margin',
                },
                {
                  containerStyle: flex.center,
                  description:
                    'Parent container with `alignItems: center` and `justifyContent: center`',
                  keyframes: {
                    '0%, 100%': {
                      marginRight: 0,
                    },
                    '25%': {
                      marginRight: '22.5%',
                    },
                    '50%': {
                      marginRight: spacing.md,
                    },
                    '75%': {
                      marginRight: '10%',
                    },
                  },
                  title: 'Right Margin',
                },
              ],
              title: 'Mixed Margins',
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  animatedBox: {
    backgroundColor: colors.primaryDark,
  },
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.sm,
    width: sizes.sm,
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 3.99 * sizes.sm,
  },
});
