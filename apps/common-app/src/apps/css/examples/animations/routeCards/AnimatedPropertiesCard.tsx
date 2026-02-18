import type { ReactNode } from 'react';
import { Children, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { CSSAnimationSettings } from 'react-native-reanimated';
import Animated, { css } from 'react-native-reanimated';

import type { RouteCardComponent } from '@/apps/css/components';
import { RouteCard } from '@/apps/css/components';
import { useFocusPlayState } from '@/apps/css/hooks';
import { colors, radius, sizes, spacing } from '@/theme';

const exampleAnimationSettings: CSSAnimationSettings = {
  animationDuration: '3s',
  animationIterationCount: 'infinite',
};

const AnimatedPropertiesCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Animated properties like **dimensions**, **colors** and **transforms**">
    <Showcase />
  </RouteCard>
);

function Showcase() {
  return (
    <View style={styles.container}>
      <View style={styles.exampleContainer}>
        <Examples>
          <DimensionsExample />
          <InsetsExample />
          <TransformsExample />
          <ColorsExample />
          <BorderRadiusExample />
        </Examples>
      </View>
    </View>
  );
}

function Examples({ children }: { children: ReactNode }) {
  const childrenArray = Children.toArray(children);

  return (
    <Animated.View
      style={[
        styles.examples,
        {
          animationDuration: `${5 * childrenArray.length}s`,
          animationPlayState: useFocusPlayState(),
        },
      ]}>
      {/* Duplicate children for the infinite scroll animation effect */}
      {childrenArray.map((child, index) => (
        <View key={index} style={styles.example}>
          {child}
        </View>
      ))}
      {childrenArray.map((child, index) => (
        <View key={index} style={styles.example}>
          {child}
        </View>
      ))}
    </Animated.View>
  );
}

function DimensionsExample() {
  const dimensionsAnimation = useMemo(
    () =>
      css.keyframes({
        '0%': {
          height: sizes.xxs,
          width: sizes.xxs,
        },
        '12.5%': {
          height: sizes.xxs,
          width: 2 * sizes.xxs,
        },
        '37.5%': {
          height: 2 * sizes.xxs,
          width: 2 * sizes.xxs,
        },
        '62.5%': {
          height: 2 * sizes.xxs,
          width: sizes.xxs,
        },
        '87.5%': {
          height: sizes.xxs,
          width: sizes.xxs,
        },
      }),
    []
  );

  return (
    <Animated.View
      style={[
        styles.box,
        exampleAnimationSettings,
        {
          animationDirection: 'alternate',
          animationName: dimensionsAnimation,
          animationPlayState: useFocusPlayState(),
        },
      ]}
    />
  );
}

function InsetsExample() {
  const insetsAnimation = useMemo(
    () =>
      css.keyframes({
        '0%, 100%': {
          left: '50%',
          top: 0,
          transform: [{ translateX: '-50%' }],
        },
        '25%': {
          left: '100%',
          top: '50%',
          transform: [{ translateX: '-100%' }, { translateY: '-50%' }],
        },
        '50%': {
          left: '50%',
          top: '100%',
          transform: [{ translateX: '-50%' }, { translateY: '-100%' }],
        },
        '75%': {
          left: 0,
          top: '50%',
          transform: [{ translateY: '-50%' }],
        },
      }),
    []
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.box,
          exampleAnimationSettings,
          {
            animationName: insetsAnimation,
            animationPlayState: useFocusPlayState(),
            animationTimingFunction: 'linear',
          },
        ]}
      />
    </View>
  );
}

function TransformsExample() {
  const transformsAnimation = useMemo(
    () =>
      css.keyframes({
        '0%': {
          transform: [{ rotate: '0deg' }, { scaleX: 1 }, { skewX: '0deg' }],
        },
        '25%': {
          transform: [{ rotate: '90deg' }, { scaleX: 1.2 }, { skewX: '10deg' }],
        },
        '50%': {
          transform: [{ rotate: '180deg' }, { scaleX: 2 }, { skewX: '0deg' }],
        },
        '75%': {
          transform: [
            { rotate: '270deg' },
            { scaleX: 1.2 },
            { skewX: '-10deg' },
          ],
        },
        // eslint-disable-next-line perfectionist/sort-objects
        '100%': {
          transform: [{ rotate: '360deg' }, { scaleX: 1 }, { skewX: '0deg' }],
        },
      }),
    []
  );

  return (
    <Animated.View
      style={[
        styles.box,
        exampleAnimationSettings,
        {
          animationName: transformsAnimation,
          animationPlayState: useFocusPlayState(),
        },
      ]}
    />
  );
}

function ColorsExample() {
  const colorsAnimation = useMemo(
    () =>
      css.keyframes({
        '0%, 100%': {
          backgroundColor: colors.primary,
        },
        '25%': {
          backgroundColor: colors.primaryLight,
        },
        '75%': {
          backgroundColor: colors.primaryDark,
        },
      }),
    []
  );

  return (
    <Animated.View
      style={[
        styles.box,
        exampleAnimationSettings,
        {
          animationName: colorsAnimation,
          animationPlayState: useFocusPlayState(),
        },
      ]}
    />
  );
}

function BorderRadiusExample() {
  const borderRadiusAnimation = useMemo(
    () =>
      css.keyframes({
        '0%, 100%': {
          borderBottomLeftRadius: radius.md,
          borderBottomRightRadius: radius.xs,
          borderTopLeftRadius: radius.xs,
          borderTopRightRadius: radius.lg,
        },
        '25%': {
          borderBottomLeftRadius: radius.lg,
          borderBottomRightRadius: radius.md,
          borderTopLeftRadius: radius.md,
          borderTopRightRadius: radius.xs,
        },
        '50%': {
          borderBottomLeftRadius: radius.xs,
          borderBottomRightRadius: radius.lg,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.md,
        },
        '75%': {
          borderBottomLeftRadius: radius.md,
          borderBottomRightRadius: radius.xs,
          borderTopLeftRadius: radius.xs,
          borderTopRightRadius: radius.md,
        },
      }),
    []
  );

  return (
    <Animated.View
      style={[
        styles.box,
        styles.boxLarge,
        exampleAnimationSettings,
        {
          animationName: borderRadiusAnimation,
          animationPlayState: useFocusPlayState(),
        },
      ]}
    />
  );
}

const scroll = css.keyframes({
  to: {
    transform: [{ translateY: '-50%' }],
  },
});

const styles = css.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.xs,
    height: sizes.xxs,
    width: sizes.xxs,
  },
  boxLarge: {
    height: sizes.xs,
    width: sizes.xs,
  },
  container: {
    flex: 1,
    overflow: 'hidden',
    width: '100%',
  },
  example: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: colors.background1,
    borderRadius: radius.sm,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  exampleContainer: {
    height: sizes.xxxl,
    left: '50%',
    position: 'absolute',
    transform: [
      { translateX: '-50%' },
      { rotate: '5deg' },
      { translateY: -spacing.xs },
    ],
    width: '75%',
  },
  examples: {
    animationIterationCount: 'infinite',
    animationName: scroll,
    animationTimingFunction: 'linear',
    backgroundColor: colors.primaryLight,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm / 2,
  },
});

export default AnimatedPropertiesCard;
