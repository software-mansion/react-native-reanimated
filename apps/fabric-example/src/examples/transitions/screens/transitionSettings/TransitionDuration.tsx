import type { CSSTransitionConfig, StyleProps } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { colors, radius, sizes } from '../../../../theme';
import { ExampleScreen } from './components';

export default function TransitionDuration() {
  const config: CSSTransitionConfig = {
    transitionProperty: 'width',
    transitionTimingFunction: 'linear',
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
      sharedConfig={config}
      transitionStyles={[{ width: 0 }, { width: '100%' }]}
      cards={[
        {
          title: 'Positive Duration',
          items: [
            { transitionDuration: '800ms', label: '800ms' },
            { transitionDuration: '2s', label: '2s' },
            { transitionDuration: 3500, label: '3500' },
          ],
        },
        {
          title: 'Zero Duration',
          description: (
            <>
              If duration is not specified or is set to 0 (0s, 0ms, 0), style
              change will be applied immediately with no animation.
            </>
          ),
          items: [
            {
              transitionDuration: '0s',
              label: '0s (default)',
            },
          ],
        },
      ]}
      renderExample={renderExample}
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
