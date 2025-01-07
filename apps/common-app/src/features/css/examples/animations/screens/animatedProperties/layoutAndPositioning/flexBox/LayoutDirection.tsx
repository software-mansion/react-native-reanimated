import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, flex, radius, sizes } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

const BOX_COLORS = [colors.primaryLight, colors.primary, colors.primaryDark];

export default function LayoutDirection() {
  return (
    <ExamplesScreen
      CardComponent={VerticalExampleCard}
      buildAnimation={() => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: {
          from: {
            direction: 'ltr',
          },
          to: {
            direction: 'rtl',
          },
        },
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[StyleSheet.absoluteFill, animation]}>
          {Array.from({ length: BOX_COLORS.length }).map((_, columnIndex) => (
            <View key={columnIndex} style={flex.row}>
              {Array.from({ length: BOX_COLORS.length - columnIndex }).map(
                (__, rowIndex) => (
                  <View
                    key={rowIndex}
                    style={[
                      styles.box,
                      {
                        backgroundColor:
                          BOX_COLORS[
                            (rowIndex + columnIndex) % BOX_COLORS.length
                          ],
                      },
                    ]}
                  />
                )
              )}
            </View>
          ))}
        </Animated.View>
      )}
      sections={[
        {
          examples: [
            {
              description:
                "`direction` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
              minExampleHeight: sizes.xxxl,
              title: 'Changing Layout Direction',
            },
          ],
          title: 'Layout Direction',
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
