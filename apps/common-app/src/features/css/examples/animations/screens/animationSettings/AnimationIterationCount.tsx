import { StyleSheet, View } from 'react-native';
import type { CSSAnimationProperties } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes } from '@/theme';

import { ExampleScreen } from './components';

export default function AnimationIterationCount() {
  return (
    <ExampleScreen
      animation={{
        animationDuration: '2s',
        animationFillMode: 'forwards',
        animationName: {
          '50%': {
            left: '100%',
            transform: [{ translateX: '-100%' }],
          },
        },
        animationTimingFunction: 'linear',
      }}
      cards={[
        {
          items: [
            { label: '1 (default)' },
            { animationIterationCount: 2, label: '2' },
            { animationIterationCount: 0, label: '0' },
          ],
          title: 'Integer Iteration Count',
        },
        {
          items: [
            { animationIterationCount: 0.5, label: '0.5' },
            { animationIterationCount: 1.75, label: '1.75' },
          ],
          title: 'Fractional Iteration Count',
        },
        {
          items: [{ animationIterationCount: 'infinite', label: 'infinite' }],
          title: 'Infinite Iteration Count',
        },
      ]}
      renderExample={(exampleConfig: CSSAnimationProperties) => (
        <View style={styles.wrapper}>
          <Animated.View style={[styles.box, exampleConfig]} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.sm,
    width: sizes.sm,
  },
  wrapper: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
});
