import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';

export default function AlignSelf() {
  return (
    <ExamplesScreen
      CardComponent={VerticalExampleCard}
      buildAnimation={() => ({
        animationDuration: '5s',
        animationIterationCount: 'infinite',
        animationName: {
          '0%, 100%': {
            alignSelf: 'stretch',
          },
          '20%': {
            alignSelf: 'flex-start',
          },
          '40%': {
            alignSelf: 'flex-end',
          },
          '60%': {
            alignSelf: 'center',
          },
          '80%': {
            alignSelf: 'baseline',
          },
        },
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              styles.box,
              animation,
              {
                backgroundColor: colors.primaryDark,
                minWidth: sizes.md,
                width: 'auto',
              },
            ]}
          />
          <View style={[styles.box, { backgroundColor: colors.primary }]} />
          <View
            style={[styles.box, { backgroundColor: colors.primaryLight }]}
          />
        </View>
      )}
      sections={[
        {
          examples: [
            {
              description:
                "`alignSelf` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
              title: 'Changing Align Self',
            },
          ],
          title: 'Align Self',
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
