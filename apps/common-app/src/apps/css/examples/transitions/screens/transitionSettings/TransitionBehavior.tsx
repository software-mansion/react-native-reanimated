import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes } from '@/theme';

import { ExampleScreen } from './components';

export default function TransitionBehavior() {
  return (
    <ExampleScreen
      cards={[
        {
          description: [
            '**Transition behavior** determines whether the transition is applied to **discrete properties**. By default, `transitionBehavior` is `normal`, which applies transition only to **continuous properties** and discrete property changes are **applied immediately**. `allowDiscrete` allows transitions to be applied to **discrete properties**, resulting in **delayed changes**.',
            'Discrete-animated properties generally flip between two values **at the midpoint** of the animation, except for the `display` property, which is changed at the moment of the **transition start**.',
          ],
          items: [
            { label: 'normal (default)' },
            { label: 'allow-discrete', transitionBehavior: 'allow-discrete' },
          ],
          title: 'Transition Behavior',
        },
      ]}
      renderExample={(exampleConfig, style) => (
        <Animated.View style={[styles.wrapper, exampleConfig, style]}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Animated.View key={index} style={styles.box} />
          ))}
        </Animated.View>
      )}
      transitionProperties={{
        transitionDuration: '1s',
        transitionProperty: 'justifyContent',
        transitionTimingFunction: 'linear',
      }}
      transitionStyles={[
        { justifyContent: 'center' },
        { justifyContent: 'space-between' },
        { justifyContent: 'flex-start' },
        { justifyContent: 'flex-end' },
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
    flexDirection: 'row',
    overflow: 'hidden',
  },
});
