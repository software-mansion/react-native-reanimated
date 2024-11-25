import { StyleSheet } from 'react-native';
import Animated, { cubicBezier, steps } from 'react-native-reanimated';

import { Screen } from '@/components';
import { colors, flex, radius, sizes } from '@/theme';

export default function KeyframeTimingFunctions() {
  return (
    <Screen style={flex.center}>
      <Animated.View
        style={[
          styles.box,
          {
            animationDirection: 'alternate',
            animationDuration: '4s',
            animationIterationCount: 'infinite',
            animationName: {
              '0%': {
                animationTimingFunction: 'easeIn',
                transform: [{ translateX: -sizes.xl }],
                width: sizes.xxl,
              },
              '33%': {
                animationTimingFunction: steps(5),
                transform: [{ translateY: sizes.xl }],
              },
              '60%': {
                backgroundColor: 'blue',
                transform: [{ translateY: -sizes.xl }],
              },
              '100%': {
                backgroundColor: 'red',
                transform: [{ translateX: sizes.xl }],
                width: sizes.xl,
              },
            },
            animationTimingFunction: cubicBezier(0.175, 0.885, 0.32, 1.275),
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: sizes.xl,
    width: sizes.xl,
  },
});
