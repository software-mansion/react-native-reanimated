import { colors, flex, radius, sizes } from '../../../../theme';
import { StyleSheet, View } from 'react-native';
import type {
  CSSTransitionConfig,
  CSSTransitionSettings,
  StyleProps,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
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
      sharedConfig={sharedConfig}
      transitionStyles={[
        { width: sizes.xs, height: sizes.xs, backgroundColor: colors.primary },
        {
          width: sizes.lg,
          height: sizes.lg,
          backgroundColor: colors.primaryDark,
        },
      ]}
      cards={[
        {
          title: 'Transition Property',
          description:
            "Only properties listed in 'transitionProperty' will animate when changed. In the examples below, style changes are the same but transition properties are different.",
          items: [
            { transitionProperty: 'width', label: '"width"' },
            { transitionProperty: 'height', label: '"height"' },
            {
              transitionProperty: ['width', 'height'],
              label: '["width", "height"]',
            },
            { transitionProperty: 'all', label: '"all"' },
          ],
        },
      ]}
      renderExample={renderExample}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...flex.center,
    height: sizes.xl,
    borderRadius: radius.sm,
    backgroundColor: colors.background2,
  },
  box: {
    borderRadius: radius.sm,
  },
});
