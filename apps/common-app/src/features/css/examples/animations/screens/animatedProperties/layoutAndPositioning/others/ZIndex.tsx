import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes, spacing } from '@/theme';
import { lighten } from '@/utils';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

const BOX_STYLES = Array.from(
  { length: 3 },
  (_, index) =>
    ({
      backgroundColor: lighten(colors.primary, 15 * index),
      borderRadius: radius.sm,
      height: sizes.md,
      left: spacing.sm * (index + 1),
      position: 'absolute',
      top: spacing.sm * (index + 1),
      width: sizes.md,
      zIndex: index + 1,
    }) satisfies ViewStyle
);

export default function ZIndex() {
  return (
    <ExamplesScreen
      CardComponent={VerticalExampleCard}
      buildAnimation={() => ({
        animationDuration: '3s',
        animationIterationCount: 'infinite',
        animationName: {
          to: {
            zIndex: 3,
          },
        },
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <View style={styles.container}>
          {BOX_STYLES.map((style, index) => (
            <View key={index} style={[styles.box, style]} />
          ))}
          <Animated.View
            style={[
              styles.box,
              { backgroundColor: colors.primaryDark },
              animation,
            ]}
          />
        </View>
      )}
      sections={[
        {
          examples: [
            {
              description:
                "In the example below you can see that the `z-index` change is **not abrupt**. Even though, the `z-index` property is a discrete property (that means, it **can't be any number**), it is **incremented gradually** before reaching the final value.",
              title: 'Changing z-index',
            },
          ],
          title: 'Z-index',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    bottom: spacing.xs,
    height: sizes.lg,
    width: sizes.lg,
  },
  container: {
    height: sizes.lg,
    width: sizes.lg,
  },
});
