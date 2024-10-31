import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { Children, useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import type { RouteCardComponent } from '@/components';
import { RouteCard } from '@/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const scrollAnimation: CSSAnimationConfig = {
  animationIterationCount: 'infinite',
  animationName: {
    to: {
      transform: [{ translateY: '-50%' }],
    },
  },
  animationTimingFunction: 'linear',
};

const AnimatedPropertiesCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Animated properties like **flex styles**, **margins**, **dimensions** and more">
    <Showcase />
  </RouteCard>
);

function Showcase() {
  return (
    <View style={styles.container}>
      <View style={styles.exampleContainer}>
        <Examples>
          <FlexExample />
          <PaddingExample />
          <MarginsExample />
          <TextColorsExample />
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
          animationPlayState: useIsFocused() ? 'running' : 'paused',
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

const styles = StyleSheet.create({
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
      { translateX: '-40%' },
      { rotate: '-5deg' },
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

function FlexExample() {
  const [expandedIndex, setExpandedIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        setExpandedIndex((prev) => (prev + 1) % 4);
      }, 1500);

      return () => {
        clearInterval(interval);
      };
    }, [])
  );

  return (
    <View style={flexStyles.container}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            flexStyles.box,
            {
              flex: index === expandedIndex ? 2 : 1,
              transitionDuration: 300,
              transitionProperty: 'flex',
            },
          ]}
        />
      ))}
    </View>
  );
}

const flexStyles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.xs,
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    gap: 1,
    height: sizes.xxs,
    width: '75%',
  },
});

function PaddingExample() {
  const [padding, setPadding] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        setPadding((prev) => (prev === 0 ? spacing.xxs : 0));
      }, 1500);

      return () => {
        clearInterval(interval);
      };
    }, [])
  );

  return (
    <Animated.View
      style={[
        paddingStyles.box,
        { padding, transitionDuration: 300, transitionProperty: 'padding' },
      ]}>
      <View style={paddingStyles.boxInner} />
    </Animated.View>
  );
}

const paddingStyles = StyleSheet.create({
  box: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    height: sizes.sm,
    width: sizes.sm,
  },
  boxInner: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: '100%',
    width: '100%',
  },
});

function MarginsExample() {
  const [margin, setMargin] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        setMargin((prev) => (prev === 0 ? spacing.xxs : 0));
      }, 1500);

      return () => {
        clearInterval(interval);
      };
    }, [])
  );

  return (
    <View style={marginStyles.container}>
      <View style={[marginStyles.box]} />
      <Animated.View
        style={[
          marginStyles.box,
          marginStyles.boxAnimated,
          {
            margin,
            transitionDuration: 300,
            transitionProperty: 'margin',
          },
        ]}
      />
      <View style={[marginStyles.box]} />
    </View>
  );
}

const marginStyles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.xs,
    height: 12,
    width: 12,
  },
  boxAnimated: {
    backgroundColor: colors.primaryDark,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 1,
  },
});

const COLORS = [colors.white, colors.primary, colors.primaryDark];

function TextColorsExample() {
  const [colorIndex, setColorIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        setColorIndex((prev) => (prev + 1) % COLORS.length);
      }, 1500);

      return () => {
        clearInterval(interval);
      };
    }, [])
  );

  return (
    <Animated.View
      style={[
        textColorsStyles.textWrapper,
        {
          backgroundColor: COLORS[(colorIndex + 1) % COLORS.length],
          transitionDuration: 300,
          transitionProperty: 'backgroundColor',
        },
      ]}>
      <Animated.Text
        style={[
          textColorsStyles.text,
          {
            color: COLORS[colorIndex],
            transitionDuration: 300,
            transitionProperty: 'color',
          },
        ]}>
        Aa
      </Animated.Text>
    </Animated.View>
  );
}

const textColorsStyles = StyleSheet.create({
  text: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  textWrapper: {
    ...flex.center,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    height: sizes.sm,
    width: sizes.sm,
  },
});

export default AnimatedPropertiesCard;
