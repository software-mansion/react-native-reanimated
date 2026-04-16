import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

export default function Position() {
  return (
    <ExamplesScreen
      CardComponent={VerticalExampleCard}
      buildAnimation={() => ({
        animationDuration: '3s',
        animationIterationCount: 'infinite',
        animationName: {
          '0%': {
            position: 'static',
          },
          '50%': {
            left: spacing.xl,
            position: 'relative',
            top: spacing.xl,
          },
          // eslint-disable-next-line perfectionist/sort-objects
          '100%': {
            left: spacing.xl,
            position: 'absolute',
            top: spacing.xl,
          },
        },
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <View style={styles.container}>
          <View style={styles.box} />
          <Animated.View
            style={[
              animation,
              styles.box,
              { backgroundColor: colors.primaryDark, zIndex: 1 },
            ]}
          />
          <View style={styles.box} />
        </View>
      )}
      sections={[
        {
          examples: [
            {
              description:
                'This example shows how the view in the center hehaves when its `position` property changes during animation. `top` and `left` properties were added just to make the change of layout more visible.',
              title: 'Changing position',
            },
          ],
          title: 'Position',
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
  },
});
