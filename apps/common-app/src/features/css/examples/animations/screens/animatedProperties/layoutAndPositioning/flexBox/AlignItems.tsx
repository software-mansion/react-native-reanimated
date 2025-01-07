import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

export default function AlignItems() {
  return (
    <ExamplesScreen
      CardComponent={VerticalExampleCard}
      buildAnimation={() => ({
        animationDuration: '5s',
        animationIterationCount: 'infinite',
        animationName: {
          '0%, 100%': {
            alignItems: 'stretch',
          },
          '20%': {
            alignItems: 'flex-start',
          },
          '40%': {
            alignItems: 'flex-end',
          },
          '60%': {
            alignItems: 'center',
          },
          '80%': {
            alignItems: 'baseline',
          },
        },
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[StyleSheet.absoluteFill, animation]}>
          <View
            style={[styles.box, { backgroundColor: colors.primaryLight }]}
          />
          <View style={[styles.box, { backgroundColor: colors.primary }]} />
          <View style={[styles.box, { backgroundColor: colors.primaryDark }]} />
        </Animated.View>
      )}
      sections={[
        {
          examples: [
            {
              description:
                "`alignItems` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
              title: 'Changing Align Items',
            },
          ],
          title: 'Align Items',
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
});
