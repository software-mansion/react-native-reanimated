import { colors, radius, sizes } from '../../../../theme';
import { StyleSheet, View } from 'react-native';
import type { CSSTransitionConfig, StyleProps } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { ExampleScreen } from './components';

export default function TransitionDelay() {
  const sharedConfig: CSSTransitionConfig = {
    transitionProperty: 'width',
    transitionTimingFunction: 'linear',
    transitionDuration: '3s',
  };

  const renderExample = (
    exampleConfig: CSSTransitionConfig,
    style: StyleProps
  ) => (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.box, exampleConfig, style]} />
    </View>
  );

  return (
    <ExampleScreen
      sharedConfig={sharedConfig}
      transitionStyles={[{ width: 0 }, { width: '100%' }]}
      renderExample={renderExample}
      cards={[
        {
          title: 'Positive Delay',
          items: [
            { label: '0s (default)' },
            { transitionDelay: '500ms', label: '500ms' },
            { transitionDelay: '2s', label: '2s' },
            { transitionDelay: 3500, label: '3500' },
          ],
        },
        {
          title: 'Negative Delay',
          description:
            'A negative value causes the transition to begin immediately, but partway through its cycle. For example, if you specify -1s as the transition delay time, the transition will begin immediately but will start 1 second into the transition.',
          items: [
            { label: '0s (default)' },
            { transitionDelay: '-500ms', label: '-500ms' },
            { transitionDelay: '-1s', label: '-1s' },
            { transitionDelay: -3000, label: '-3000' },
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
    overflow: 'hidden',
  },
});
