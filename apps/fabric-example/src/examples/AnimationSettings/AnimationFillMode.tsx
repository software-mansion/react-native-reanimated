import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import { sizes, colors, radius } from '../../theme';
import Animated from 'react-native-reanimated';
import { ExampleScreen } from './components';

export default function AnimationFillMode() {
  const config: CSSAnimationConfig = {
    animationName: {
      from: {
        backgroundColor: colors.secondary,
      },
      to: {
        left: '100%',
        transform: [{ translateX: '-100%' }],
        backgroundColor: colors.secondary,
      },
    },
    animationDuration: '2s',
    animationDelay: '1s',
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
          title: 'Fill Mode',
          items: [
            { animationFillMode: 'none', label: 'none (default)' },
            { animationFillMode: 'forwards', label: 'forwards' },
            { animationFillMode: 'backwards', label: 'backwards' },
            { animationFillMode: 'both', label: 'both' },
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
  wrapper: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
});
