import { StyleSheet, View } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import {
  ExampleCard,
  ExamplesScreen,
  VerticalExampleCard,
} from '@/apps/css/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const EXAMPLES = [
  {
    keyframes: {
      from: {
        flexBasis: 0,
      },
      to: {
        flexBasis: 100,
      },
    },
    name: 'Absolute',
  },
  {
    keyframes: {
      from: {
        flexBasis: '10%',
      },
      to: {
        flexBasis: '75%',
      },
    },
    name: 'Relative',
  },
  {
    keyframes: {
      from: {
        flexBasis: 50,
      },
      to: {
        flexBasis: '75%',
      },
    },
    name: 'Mixed',
  },
] satisfies Array<{
  keyframes: CSSAnimationKeyframes;
  name: string;
}>;

export default function FlexBasis() {
  return (
    <ExamplesScreen<{
      keyframes: CSSAnimationKeyframes;
      flexDirection: 'column' | 'row';
    }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation, flexDirection }) => (
        <View
          style={[
            styles.container,
            { flexDirection },
            { [flexDirection === 'row' ? 'width' : 'height']: 5 * sizes.md },
          ]}>
          <View style={[styles.box]} />
          <Animated.View
            style={[
              styles.box,
              { backgroundColor: colors.primaryDark },
              animation,
            ]}
          />
          <View style={[styles.box]} />
        </View>
      )}
      tabs={EXAMPLES.map(({ keyframes, name }) => ({
        name,
        sections: [
          {
            description: [
              '`flexBasis` is a **continuous** property. That means, it **is smoothly animated** between values.',
            ],
            examples: [
              {
                description: 'When `flexDirection` is set to `row`.',
                flexDirection: 'row',
                keyframes,
                title: 'Row',
              },
              {
                CardComponent: ExampleCard,
                collapsedExampleHeight: 275,
                description: 'When `flexDirection` is set to `column`.',
                flexDirection: 'column',
                keyframes,
                minExampleHeight: 275,
                title: 'Column',
              },
            ],
            title: 'Flex Basis',
          },
        ],
      }))}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
    width: sizes.md,
  },
  container: {
    ...flex.center,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    flexDirection: 'row',
    padding: spacing.sm,
  },
});
