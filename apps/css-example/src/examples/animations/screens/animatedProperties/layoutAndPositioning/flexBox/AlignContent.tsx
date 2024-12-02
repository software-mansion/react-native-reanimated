import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/components';
import { colors, flex, radius, sizes } from '@/theme';

const BOX_COLORS = [colors.primaryDark, colors.primary, colors.primaryLight];

export default function AlignContent() {
  return (
    <ExamplesScreen
      CardComponent={VerticalExampleCard}
      buildAnimation={() => ({
        animationDuration: '5s',
        animationIterationCount: 'infinite',
        animationName: {
          '0%, 100%': {
            alignContent: 'flex-start',
          },
          '16.67%': {
            alignContent: 'flex-end',
          },
          '33.33%': {
            alignContent: 'stretch',
          },
          '50%': {
            alignContent: 'center',
          },
          '66.67%': {
            alignContent: 'space-between',
          },
          '83.33%': {
            alignContent: 'space-around',
          },
        },
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[StyleSheet.absoluteFill, flex.wrap, animation]}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.box,
                { backgroundColor: BOX_COLORS[index % 3] },
                index % 3 === 0
                  ? {
                      minWidth: sizes.md,
                      width: 'auto',
                    }
                  : {},
              ]}
            />
          ))}
        </Animated.View>
      )}
      sections={[
        {
          examples: [
            {
              description:
                "`alignContent` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
              minExampleHeight: 3 * sizes.md,
              title: 'Changing Align Content',
            },
          ],
          title: 'Align Content',
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
