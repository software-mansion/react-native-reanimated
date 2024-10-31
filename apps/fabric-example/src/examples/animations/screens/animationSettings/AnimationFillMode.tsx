import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes } from '@/theme';

import { ExampleScreen } from './components';

export default function AnimationFillMode() {
  const config: CSSAnimationConfig = {
    animationDelay: '1s',
    animationDuration: '2s',
    animationName: {
      from: {
        backgroundColor: colors.primaryDark,
      },
      to: {
        backgroundColor: colors.primaryDark,
        left: '100%',
        transform: [{ translateX: '-100%' }],
      },
    },
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
          items: [
            { animationFillMode: 'none', label: 'none (default)' },
            { animationFillMode: 'forwards', label: 'forwards' },
            { animationFillMode: 'backwards', label: 'backwards' },
            { animationFillMode: 'both', label: 'both' },
          ],
          title: 'Fill Mode',
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
