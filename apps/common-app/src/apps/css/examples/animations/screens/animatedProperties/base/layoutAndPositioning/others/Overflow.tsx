import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';

export default function Overflow() {
  return (
    <ExamplesScreen
      CardComponent={VerticalExampleCard}
      buildAnimation={() => ({
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: {
          from: {
            overflow: 'hidden',
          },
          to: {
            overflow: 'visible',
          },
        },
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[animation, styles.box]}>
          <View style={[styles.box, styles.innerBox]} />
        </Animated.View>
      )}
      sections={[
        {
          description:
            "`overflow` is a **discrete** property. That means, it **can't be smoothly animated** between values. However, we can still change this property in the animation keyframes but the change will be **abrupt**.",
          examples: [
            {
              description:
                'In this example, the component in the **foreground** is rendered inside of the component in the **background** with some offset applied. The part that is **outside** of the **background** component is **clipped**.',
              title: 'Changing Overflow',
            },
          ],
          title: 'Overflow',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.sm,
    height: sizes.md,
    width: sizes.md,
  },
  innerBox: {
    backgroundColor: colors.primary,
    left: '25%',
    position: 'absolute',
    top: '25%',
  },
});
