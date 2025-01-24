import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

export default function Flex() {
  return (
    <ExamplesScreen
      CardComponent={VerticalExampleCard}
      buildAnimation={() => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: {
          from: {
            flex: 0,
          },
          to: {
            flex: 1,
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
                '`flex` is a **continuous** property. That means, it **is smoothly animated** between values.',
                'It behaves like `flexGrow` and `flexShrink` combined.',
              ],
            },
          ],
          title: 'Flex',
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
