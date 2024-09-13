import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import { sizes, colors, radius } from '../../theme';
import Animated from 'react-native-reanimated';
import { ExampleScreen } from './components';

export default function AnimationDuration() {
  const config: CSSAnimationConfig = {
    animationName: {
      // TODO - remove from step once initial frame can be read in the CSS animation
      from: {
        width: 0,
      },
      to: {
        width: '100%',
      },
    },
    animationIterationCount: 'infinite',
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
          title: 'Positive Duration',
          items: [
            { animationDuration: '500ms', label: '500ms' },
            { animationDuration: '2s', label: '2s' },
            { animationDuration: 3500, label: '3500' },
          ],
        },
        {
          title: 'Zero Duration',
          description:
            'If duration is not specified or is set to 0 (0s, 0ms, 0), the animation will not run.',
          items: [{ animationDuration: '0s', label: '0s (default)' }],
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
  },
  wrapper: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
});
