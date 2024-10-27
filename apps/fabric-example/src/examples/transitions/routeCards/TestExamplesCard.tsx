import { colors, radius, sizes } from '../../../theme';
import type { RouteCardComponent } from '../../../components';
import { RouteCard } from '../../../components';
import { StyleSheet, View } from 'react-native';
import type { CSSTransitionConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

const TestExamplesCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Examples to debug **edge cases**, test **performance**, etc.">
    <Showcase />
  </RouteCard>
);

const TRANSITION_CONFIG: CSSTransitionConfig = {
  transitionProperty: 'transform',
  transitionDuration: 500,
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
    height: sizes.lg,
    width: sizes.lg,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  leverBase: {
    width: 42,
    height: sizes.xxxs,
    borderTopLeftRadius: radius.full,
    borderTopRightRadius: radius.full,
    backgroundColor: colors.primaryDark,
  },
  leverHolder: {
    position: 'absolute',
    width: sizes.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    height: sizes.xxs,
  },
  lever: {
    height: sizes.md,
    width: sizes.xxxs,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    transformOrigin: 'bottom',
  },
  leverKnob: {
    position: 'absolute',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    left: '50%',
    width: sizes.xs,
    height: sizes.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDark,
  },
});

export default TestExamplesCard;
