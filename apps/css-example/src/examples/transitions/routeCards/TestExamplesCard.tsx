import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { CSSTransitionConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import type { RouteCardComponent } from '@/components';
import { RouteCard } from '@/components';
import { colors, radius, sizes } from '@/theme';

const TestExamplesCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Examples to test **edge cases**, **performance**, etc. (useful for devs)">
    <Showcase />
  </RouteCard>
);

const TRANSITION_CONFIG: CSSTransitionConfig = {
  transitionDuration: 500,
  transitionProperty: 'transform',
  transitionTimingFunction: 'easeInOut',
};

function Showcase() {
  const [open, setOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        setOpen(true);
      }, 250);

      const interval = setInterval(() => {
        setOpen((prev) => !prev);
      }, 1500);

      return () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.lever,
          TRANSITION_CONFIG,
          {
            transform: [{ rotate: open ? '30deg' : '-30deg' }],
          },
        ]}>
        <View style={styles.leverKnob} />
      </Animated.View>
      <Animated.View
        style={[
          styles.leverHolder,
          TRANSITION_CONFIG,
          {
            transform: [{ translateX: open ? '15%' : '-15%' }],
          },
        ]}
      />
      <View style={styles.leverBase} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: sizes.lg,
    justifyContent: 'flex-end',
    width: sizes.lg,
  },
  lever: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: sizes.md,
    transformOrigin: 'bottom',
    width: sizes.xxxs,
  },
  leverBase: {
    backgroundColor: colors.primaryDark,
    borderTopLeftRadius: radius.full,
    borderTopRightRadius: radius.full,
    height: sizes.xxxs,
    width: 42,
  },
  leverHolder: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    height: sizes.xxs,
    position: 'absolute',
    width: sizes.xs,
  },
  leverKnob: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.full,
    height: sizes.xs,
    left: '50%',
    position: 'absolute',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    width: sizes.xs,
  },
});

export default TestExamplesCard;
