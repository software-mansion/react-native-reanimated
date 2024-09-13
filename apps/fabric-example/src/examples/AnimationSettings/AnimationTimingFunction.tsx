import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import { colors, radius, sizes } from '../../theme';
import Animated from 'react-native-reanimated';
import { ExampleScreen } from './components';

export default function AnimationTimingFunction() {
  const config: CSSAnimationConfig = {
    animationName: {
      to: {
        left: '100%',
        transform: [{ translateX: '-100%' }],
      },
    },
    animationIterationCount: 'infinite',
    animationDuration: '2s',
  };

  const renderExample = (exampleConfig: CSSAnimationConfig) => (
    <View style={styles.outerWrapper}>
      <View style={styles.innerWrapper}>
        <Animated.View style={[styles.box, exampleConfig]} />
      </View>
    </View>
  );

  return (
    <ExampleScreen
      config={config}
      renderExample={renderExample}
      cards={[
        {
          title: 'Predefined Easings',
          items: [
            { animationTimingFunction: 'linear', label: 'linear' },
            {
              animationTimingFunction: 'ease-in-out-back',
              label: 'ease-in-out-back',
            },
          ],
        },
        {
          title: 'Cube Bezier Easings',
          description: 'Some examples of cubic bezier easings.',
          items: [
            // TODO - add cubic bezier examples
          ],
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
  outerWrapper: {
    backgroundColor: colors.background2,
    paddingHorizontal: sizes.sm / 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  innerWrapper: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
});
