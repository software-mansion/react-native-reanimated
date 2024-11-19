import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { TestExampleScreen } from '@/components';
import { colors, radius, sizes } from '@/theme';

const marginAnimation: CSSAnimationConfig = {
  animationDirection: 'alternate',
  animationDuration: '2s',
  animationIterationCount: 'infinite',
  animationName: {
    from: {
      marginHorizontal: 10,
    },
    to: {
      marginHorizontal: '35%',
    },
  },
  animationTimingFunction: 'linear',
};

export default function RelativeMargins() {
  return (
    <TestExampleScreen
      sections={[
        {
          content: [
            {
              content: [
                'This example shows **2 different problems** with relative margins:',
                '1. **Animation speed**, even though the `animationTimingFunction` is set to `linear`, is **not constant** when we animate between absolute (`10`)  and relative (`35%`) values.',
                '2. Relative margins **change the size of the parent** container (but `min-width` on the web works similar to the `width` in React Native, so maybe it is not a problem).',
              ],
              title: 'Description',
            },
            {
              content: [
                '1. The animation should have a constant speed, regardless of the margin value unit if the `animationTimingFunction` is set to `linear`.',
                '2. The parent container should not change its size when the child component changes its margin (maybe it is not a problem).',
              ],
              title: 'Expected behavior',
            },
          ],
          example: <Example />,
          labelTypes: ['needsFix'],
          title: 'Relative and mixed unit margins',
          webExampleLink:
            'https://codepen.io/Mateusz-opaciski/pen/NWQVMMp?editors=1100',
        },
      ]}
    />
  );
}

function Example() {
  return (
    <View style={styles.container}>
      <View style={styles.box} />
      <Animated.View
        style={[styles.box, marginAnimation, styles.animatedBox]}
      />
      <View style={styles.box} />
    </View>
  );
}

const styles = StyleSheet.create({
  animatedBox: {
    backgroundColor: colors.primaryDark,
  },
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.sm,
    width: sizes.sm,
  },
  container: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    flexDirection: 'row',
  },
});
