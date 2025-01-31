import { StyleSheet, View } from 'react-native';
import type { CSSAnimationProperties } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes } from '@/theme';

import { ExampleScreen } from './components';

export default function AnimationDirection() {
  return (
    <ExampleScreen
      animation={{
        animationDuration: '3s',
        animationIterationCount: 'infinite',
        animationName: {
          from: {
            width: 0,
          },
          to: {
            width: '100%',
          },
        },
      }}
      cards={[
        {
          description:
            'Alternate animations change direction on each iteration. Changes are visible only if the number of iterations is greater than one.',
          items: [
            { animationDirection: 'normal', label: 'normal (default)' },
            { animationDirection: 'reverse', label: 'reverse' },
            { animationDirection: 'alternate', label: 'alternate' },
            {
              animationDirection: 'alternate-reverse',
              label: 'alternate-reverse',
            },
          ],
          title: 'Animation Direction',
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
  },
  wrapper: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
});
