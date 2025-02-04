import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, radius, sizes, spacing } from '@/theme';

export default function BoxSizing() {
  return (
    <ExamplesScreen
      CardComponent={VerticalExampleCard}
      buildAnimation={() => ({
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: {
          from: {
            boxSizing: 'border-box',
          },
          to: {
            boxSizing: 'content-box',
          },
        },
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <View style={[styles.common, styles.parent]}>
          <Animated.View style={[styles.common, styles.child, animation]} />
        </View>
      )}
      sections={[
        {
          description:
            "`boxSizing` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
          examples: [
            {
              // 'In this example, the component in the **foreground** is rendered inside of the component in the **background** with some offset applied. The part that is **outside** of the **background** component is **clipped**.',
              title: 'Changing Box Sizing',
            },
          ],
          labelTypes: ['web'],
          title: 'Box Sizing',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  child: {
    borderColor: colors.primary,
    height: sizes.lg,
    width: '100%',
  },
  common: {
    borderRadius: radius.md,
    borderWidth: spacing.sm,
  },
  parent: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryDark,
    height: sizes.xxl,
    width: sizes.xxl,
  },
});
