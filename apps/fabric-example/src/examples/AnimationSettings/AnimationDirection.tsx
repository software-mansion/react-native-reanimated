import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import { sizes, colors, radius } from '../../theme';
import Animated from 'react-native-reanimated';
import { ExampleScreen } from './components';

export default function AnimationDirection() {
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
    animationDuration: '3s',
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
          title: 'Animation Direction',
          description:
            'Alternate animations change direction on each iteration. Changes are visible only if the number of iterations is greater than one.',
          items: [
            { animationDirection: 'normal', label: 'normal' },
            { animationDirection: 'reverse', label: 'reverse' },
            { animationDirection: 'alternate', label: 'alternate' },
            {
              animationDirection: 'alternate-reverse',
              label: 'alternate-reverse',
            },
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
  },
  wrapper: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
});
