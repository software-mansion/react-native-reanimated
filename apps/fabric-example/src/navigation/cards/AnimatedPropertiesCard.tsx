import { StyleSheet, View } from 'react-native';
import type { RouteCardComponent } from '../../components';
import { RouteCard } from '../../components';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { colors, radius, sizes, spacing } from '../../theme';
import { Children } from 'react';
import type { ReactNode } from 'react';

const scrollAnimation: CSSAnimationConfig = {
  animationName: {
    to: {
      transform: [{ translateY: '-50%' }],
    },
  },
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
};

const exampleAnimationSettings: Omit<CSSAnimationConfig, 'animationName'> = {
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
        scrollAnimation,
        { animationDuration: `${5 * childrenArray.length}s` },
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
  return (
    <Animated.View
      style={[
        styles.box,
        exampleAnimationSettings,
        {
          animationName: {
            '0%': {
              width: 0,
              height: sizes.xxs,
            },
            '25%': {
              width: 2 * sizes.xxs,
              height: sizes.xxs,
            },
            '50%': {
              width: 2 * sizes.xxs,
              height: 2 * sizes.xxs,
            },
            '75%': {
              width: sizes.xxs,
              height: 2 * sizes.xxs,
            },
            '100%': {
              width: sizes.xxs,
              height: sizes.xxs,
            },
          },
          animationDirection: 'alternate',
        },
      ]}
    />
  );
}

function InsetsExample() {
  return (
    <Animated.View
      style={[
        styles.box,
        exampleAnimationSettings,
        {
          animationName: {
            '0%': {
              top: -sizes.xxs,
              left: 0,
            },
            '25%': {
              left: sizes.xxs,
              top: 0,
            },
            '50%': {
              top: sizes.xxs,
              left: 0,
            },
            '75%': {
              left: -sizes.xxs,
              top: 0,
            },
            '100%': {
              top: -sizes.xxs,
              left: 0,
            },
          },
        },
      ]}
    />
  );
}

function TransformsExample() {
  return (
    <Animated.View
      style={[
        styles.box,
        exampleAnimationSettings,
        {
          animationName: {
            '0%': {
              transform: [{ rotate: '0deg' }, { scaleX: 1 }, { skewX: '0deg' }],
            },
            '25%': {
              transform: [
                { rotate: '90deg' },
                { scaleX: 1.2 },
                { skewX: '10deg' },
              ],
            },
            '50%': {
              transform: [
                { rotate: '180deg' },
                { scaleX: 2 },
                { skewX: '0deg' },
              ],
            },
            '75%': {
              transform: [
                { rotate: '270deg' },
                { scaleX: 1.2 },
                { skewX: '-10deg' },
              ],
            },
            '100%': {
              transform: [
                { rotate: '360deg' },
                { scaleX: 1 },
                { skewX: '0deg' },
              ],
            },
          },
        },
      ]}
    />
  );
}

function ColorsExample() {
  return (
    <Animated.View
      style={[
        styles.box,
        exampleAnimationSettings,
        {
          animationName: {
            '0%': {
              backgroundColor: colors.primary,
            },
            '25%': {
              backgroundColor: colors.primaryLight,
            },
            '75%': {
              backgroundColor: colors.primaryDark,
            },
            '100%': {
              backgroundColor: colors.primary,
            },
          },
        },
      ]}
    />
  );
}

function BorderRadiusExample() {
  return (
    <Animated.View
      style={[
        styles.box,
        styles.boxLarge,
        exampleAnimationSettings,
        {
          animationName: {
            '0%': {
              borderTopLeftRadius: radius.xs,
              borderTopRightRadius: radius.lg,
              borderBottomLeftRadius: radius.md,
              borderBottomRightRadius: radius.xs,
            },
            '25%': {
              borderTopLeftRadius: radius.md,
              borderTopRightRadius: radius.xs,
              borderBottomLeftRadius: radius.lg,
              borderBottomRightRadius: radius.md,
            },
            '50%': {
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.md,
              borderBottomLeftRadius: radius.xs,
              borderBottomRightRadius: radius.lg,
            },
            '75%': {
              borderTopLeftRadius: radius.xs,
              borderTopRightRadius: radius.md,
              borderBottomLeftRadius: radius.md,
              borderBottomRightRadius: radius.xs,
            },
            '100%': {
              borderTopLeftRadius: radius.xs,
              borderTopRightRadius: radius.lg,
              borderBottomLeftRadius: radius.md,
              borderBottomRightRadius: radius.xs,
            },
          },
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    overflow: 'hidden',
  },
  exampleContainer: {
    position: 'absolute',
    width: '75%',
    left: '50%',
    transform: [
      { translateX: '-50%' },
      { rotate: '5deg' },
      { translateY: -spacing.xs },
    ],
    height: sizes.xxxl,
  },
  examples: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm / 2,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  example: {
    backgroundColor: colors.background1,
    borderRadius: radius.sm,
    overflow: 'hidden',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: sizes.xxs,
    height: sizes.xxs,
    backgroundColor: colors.primary,
    borderRadius: radius.xs,
  },
  boxLarge: {
    width: sizes.xs,
    height: sizes.xs,
  },
});

export default AnimatedPropertiesCard;
