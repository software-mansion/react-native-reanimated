import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import { sizes, colors, radius } from '../../theme';
import Animated from 'react-native-reanimated';
import { ExampleScreen } from './components';

export default function AnimationIterationCount() {
  const config: CSSAnimationConfig = {
    animationName: {
      '50%': {
        left: '100%',
        transform: [{ translateX: '-100%' }],
      },
    },
    animationDuration: '2s',
    animationFillMode: 'forwards',
  };

  const renderExample = (exampleConfig: CSSAnimationConfig) => (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.box, exampleConfig]} />
    </View>
  );

  return (
    <ExampleScreen
      config={config}
      renderExample={renderExample}
      cards={[
        {
          title: 'Integer Iteration Count',
          items: [
            { label: '1 (default)' },
            { animationIterationCount: 2, label: '2' },
            { animationIterationCount: 0, label: '0' },
          ],
        },
        {
          title: 'Fractional Iteration Count',
          items: [
            { animationIterationCount: 0.5, label: '0.5' },
            { animationIterationCount: 1.75, label: '1.75' },
          ],
        },
        {
          title: 'Infinite Iteration Count',
          items: [{ animationIterationCount: 'infinite', label: 'infinite' }],
        },
      ]}
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
