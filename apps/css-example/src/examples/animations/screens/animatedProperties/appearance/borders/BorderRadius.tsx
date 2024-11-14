import { StyleSheet, View } from 'react-native';
import type { CSSAnimationSettings } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationDirection: 'alternate',
  animationDuration: '1s',
  animationIterationCount: 'infinite',
};

const SECTIONS = [
  {
    examples: [
      {
        propertyName: 'borderRadius',
        title: 'borderRadius',
      },
    ],
    title: 'All Corners',
  },
  {
    examples: [
      {
        description: '(borderTopStartRadius / borderStartStartRadius)',
        propertyName: 'borderTopLeftRadius',
        title: 'borderTopLeftRadius',
      },
      {
        description: '(borderTopEndRadius / borderStartEndRadius)',
        propertyName: 'borderTopRightRadius',
        title: 'borderTopRightRadius',
      },
      {
        description: '(borderBottomStartRadius / borderEndStartRadius)',
        propertyName: 'borderBottomLeftRadius',
        title: 'borderBottomLeftRadius',
      },
      {
        description: '(borderBottomEndRadius / borderEndEndRadius)',
        propertyName: 'borderBottomRightRadius',
        title: 'borderBottomRightRadius',
      },
    ],
    title: 'Single Corner',
  },
];

export default function BorderRadius() {
  return (
    <ExamplesScreen<{ propertyName: string }>
      CardComponent={VerticalExampleCard}
      tabs={[
        {
          buildConfig: ({ propertyName }) => ({
            ...SHARED_SETTINGS,
            animationName: {
              from: {
                [propertyName]: 0,
              },
              to: {
                [propertyName]: radius.xl,
              },
            },
          }),
          name: 'Absolute',
          renderExample: ({ config }) => (
            <Animated.View style={[styles.box, config]} />
          ),
          sections: SECTIONS,
        },
        {
          buildConfig: ({ propertyName }) => ({
            ...SHARED_SETTINGS,
            animationName: {
              from: {
                [propertyName]: '25%',
              },
              to: {
                [propertyName]: '100%',
              },
            },
          }),
          name: 'Relative',
          renderExample: ({ config }) => (
            <View style={styles.boxesRow}>
              <Animated.View
                style={[styles.box, { width: sizes.xl }, config]}
              />
              <Animated.View
                style={[styles.box, { height: sizes.xl }, config]}
              />
            </View>
          ),
          sections: SECTIONS,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    height: sizes.md,
    width: sizes.md,
  },
  boxesRow: {
    flexDirection: 'row',
    ...flex.center,
    gap: spacing.md,
  },
});
