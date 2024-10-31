import { StyleSheet, View } from 'react-native';
import type {
  CSSTransitionConfig,
  CSSTransitionSettings,
  StyleProps,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, flex, radius, sizes } from '@/theme';

import { ExampleScreen } from './components';

export default function TransitionProperty() {
  const sharedConfig: CSSTransitionSettings = {
    transitionDuration: '1s',
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
      renderExample={renderExample}
      sharedConfig={sharedConfig}
      cards={[
        {
          description:
            "Only properties listed in 'transitionProperty' will animate when changed. In the examples below, style changes are the same but transition properties are different.",
          items: [
            { label: '"width"', transitionProperty: 'width' },
            { label: '"height"', transitionProperty: 'height' },
            {
              label: '["width", "height"]',
              transitionProperty: ['width', 'height'],
            },
            { label: '"all"', transitionProperty: 'all' },
          ],
          title: 'Transition Property',
        },
      ]}
      transitionStyles={[
        { backgroundColor: colors.primary, height: sizes.xs, width: sizes.xs },
        {
          backgroundColor: colors.primaryDark,
          height: sizes.lg,
          width: sizes.lg,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.sm,
  },
  wrapper: {
    ...flex.center,
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    height: sizes.xl,
  },
});
