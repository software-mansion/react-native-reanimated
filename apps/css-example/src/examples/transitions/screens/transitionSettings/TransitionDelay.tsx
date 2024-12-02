import { StyleSheet, View } from 'react-native';
import type {
  CSSTransitionProperties,
  StyleProps,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes } from '@/theme';

import { ExampleScreen } from './components';

export default function TransitionDelay() {
  return (
    <ExampleScreen
      transitionStyles={[{ width: 0 }, { width: '100%' }]}
      cards={[
        {
          items: [
            { label: '0s (default)' },
            { label: '500ms', transitionDelay: '500ms' },
            { label: '2s', transitionDelay: '2s' },
            { label: '3500', transitionDelay: 3500 },
          ],
          title: 'Positive Delay',
        },
        {
          description:
            'A negative value causes the transition to begin immediately, but partway through its cycle. For example, if you specify -1s as the transition delay time, the transition will begin immediately but will start 1 second into the transition.',
          items: [
            { label: '0s (default)' },
            { label: '-500ms', transitionDelay: '-500ms' },
            { label: '-1s', transitionDelay: '-1s' },
            { label: '-3000', transitionDelay: -3000 },
          ],
          title: 'Negative Delay',
        },
      ]}
      renderExample={(
        exampleConfig: CSSTransitionProperties,
        style: StyleProps
      ) => (
        <View style={styles.wrapper}>
          <Animated.View style={[styles.box, exampleConfig, style]} />
        </View>
      )}
      transitionProperties={{
        transitionDuration: '3s',
        transitionProperty: 'width',
        transitionTimingFunction: 'linear',
      }}
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
