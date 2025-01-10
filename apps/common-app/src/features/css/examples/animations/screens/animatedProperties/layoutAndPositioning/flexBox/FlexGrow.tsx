import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, flex, radius, sizes, spacing } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

export default function FlexGrow() {
  return (
    <ExamplesScreen
      CardComponent={VerticalExampleCard}
      buildAnimation={() => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: {
          from: {
            flexGrow: 0,
          },
          to: {
            flexGrow: 1,
          },
        },
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <View style={styles.container}>
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
      sections={[
        {
          examples: [
            {
              description: [
                '`flexGrow` is a **continuous** property that allows the child to grow to fill the remaining space in the parent container.',
                'In this example, the parent container is the light one with some padding near each side.',
              ],
            },
          ],
          title: 'Flex Grow',
        },
      ]}
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
    width: 5 * sizes.md,
  },
});
