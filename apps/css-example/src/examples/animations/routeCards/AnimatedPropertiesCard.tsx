import type { ReactNode } from 'react';
import { Children } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import type { RouteCardComponent } from '@/components';
import { RouteCard } from '@/components';
import { useFocusPlayState } from '@/hooks';
import { colors, radius, sizes, spacing } from '@/theme';

const scrollAnimation: CSSAnimationConfig = {
  animationIterationCount: 'infinite',
  animationName: {
    to: {
      transform: [{ translateY: '-50%' }],
    },
  },
  animationTimingFunction: 'linear',
};

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
        scrollAnimation,
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
  return (
    <Animated.View
      style={[
        styles.box,
        exampleAnimationSettings,
        {
          animationDirection: 'alternate',
          animationName: {
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
          },
          animationPlayState: useFocusPlayState(),
        },
      ]}
    />
  );
}

function InsetsExample() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.box,
          exampleAnimationSettings,
          {
            animationName: {
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
            },
            animationPlayState: useFocusPlayState(),
            animationTimingFunction: 'linear',
          },
        ]}
      />
    </View>
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
          animationPlayState: useFocusPlayState(),
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
            '0%, 100%': {
              backgroundColor: colors.primary,
            },
            '25%': {
              backgroundColor: colors.primaryLight,
            },
            '75%': {
              backgroundColor: colors.primaryDark,
            },
          },
          animationPlayState: useFocusPlayState(),
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
          },
          animationPlayState: useFocusPlayState(),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.primaryLight,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm / 2,
  },
});

export default AnimatedPropertiesCard;
