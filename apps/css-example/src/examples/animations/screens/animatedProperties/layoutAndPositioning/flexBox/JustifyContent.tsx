import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/components';
import { colors, radius, sizes } from '@/theme';

const BOX_COLORS = [colors.primaryLight, colors.primary, colors.primaryDark];

export default function JustifyContent() {
  return (
    <ExamplesScreen
      CardComponent={VerticalExampleCard}
      buildAnimation={() => ({
        animationDuration: '7s',
        animationIterationCount: 'infinite',
        animationName: {
          '0%, 100%': {
            justifyContent: 'flex-start',
          },
          '16.67%': {
            justifyContent: 'flex-end',
          },
          '33.33%': {
            justifyContent: 'center',
          },
          '50%': {
            justifyContent: 'space-between',
          },
          '66.67%': {
            justifyContent: 'space-around',
          },
          '83.33%': {
            justifyContent: 'space-evenly',
          },
        },
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[StyleSheet.absoluteFill, animation]}>
          {BOX_COLORS.map((color, index) => (
            <View
              key={index}
              style={[styles.box, { backgroundColor: color }]}
            />
          ))}
        </Animated.View>
      )}
      sections={[
        {
          examples: [
            {
              description:
                "`justifyContent` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
              minExampleHeight: sizes.xxxl,
              title: 'Changing Justify Content',
            },
          ],
          title: 'Justify Content',
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
