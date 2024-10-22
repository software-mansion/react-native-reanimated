import type { CSSAnimationConfig } from 'react-native-reanimated';
import { colors, radius, sizes } from '../../../../theme';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ExampleScreen } from './components';
import { useState } from 'react';

export default function AnimationPlayState() {
  const [isPaused, setIsPaused] = useState(false);

  const config: CSSAnimationConfig = {
    animationName: {
      to: {
        left: '100%',
        transform: [{ translateX: '-100%' }],
      },
    },
    animationDelay: '-1s',
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationTimingFunction: 'easeInOut',
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
          title: 'Play State',
          items: [
            { animationPlayState: 'running', label: 'Running (default)' },
            { animationPlayState: 'paused', label: 'Paused' },
          ],
        },
        {
          title: 'Toggling Play State',
          items: [{ label: `state: ${isPaused ? 'Paused' : 'Running'}` }],
          allowPause: true,
          onTogglePause: setIsPaused,
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
