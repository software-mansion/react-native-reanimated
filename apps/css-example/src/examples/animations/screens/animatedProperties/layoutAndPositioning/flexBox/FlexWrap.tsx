import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/components';
import { colors, radius, sizes } from '@/theme';

const BOX_COLORS = [colors.primaryLight, colors.primary, colors.primaryDark];

export default function FlexWrap() {
  return (
    <ExamplesScreen
      CardComponent={VerticalExampleCard}
      buildConfig={() => ({
        animationDuration: '5s',
        animationIterationCount: 'infinite',
        animationName: {
          '0%': {
            flexWrap: 'nowrap',
          },
          '50%': {
            flexWrap: 'wrap',
          },
          '100%': {
            flexWrap: 'nowrap',
          },
        },
        animationTimingFunction: 'linear',
      })}
      renderExample={({ config }) => (
        <Animated.View style={[StyleSheet.absoluteFill, config]}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View
              key={index}
              style={[styles.box, { backgroundColor: BOX_COLORS[index % 3] }]}
            />
          ))}
        </Animated.View>
      )}
      sections={[
        {
          examples: [
            {
              description:
                "`flexWrap` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
              minExampleHeight: 3.5 * sizes.md,
              title: 'Changing Flex Wrap',
            },
          ],
          title: 'Flex Wrap',
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
