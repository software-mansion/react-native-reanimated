import { StyleSheet, View } from 'react-native';
import type { RouteCardComponent } from '../../../components';
import { RouteCard } from '../../../components';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { colors, flex, radius, sizes, spacing } from '../../../theme';
import { Children, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

const scrollAnimation: CSSAnimationConfig = {
  animationName: {
    to: {
      transform: [{ translateY: '-50%' }],
    },
  },
  animationIterationCount: 'infinite',
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
    width: '100%',
    flex: 1,
    overflow: 'hidden',
  },
  exampleContainer: {
    position: 'absolute',
    width: '75%',
    left: '50%',
    transform: [
      { translateX: '-40%' },
      { rotate: '-5deg' },
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
              transitionProperty: 'flex',
              transitionDuration: 300,
              flex: index === expandedIndex ? 2 : 1,
            },
          ]}
        />
      ))}
    </View>
  );
}

const flexStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '75%',
    height: sizes.xxs,
    gap: 1,
  },
  box: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.xs,
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
        { transitionProperty: 'padding', transitionDuration: 300, padding },
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
    width: '100%',
    height: '100%',
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
            transitionProperty: 'margin',
            transitionDuration: 300,
            margin,
          },
        ]}
      />
      <View style={[marginStyles.box]} />
    </View>
  );
}

const marginStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  box: {
    width: 12,
    height: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.xs,
  },
  boxAnimated: {
    backgroundColor: colors.primaryDark,
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
          transitionProperty: 'backgroundColor',
          transitionDuration: 300,
          backgroundColor: COLORS[(colorIndex + 1) % COLORS.length],
        },
      ]}>
      <Animated.Text
        style={[
          textColorsStyles.text,
          {
            transitionProperty: 'color',
            transitionDuration: 300,
            color: COLORS[colorIndex],
          },
        ]}>
        Aa
      </Animated.Text>
    </Animated.View>
  );
}

const textColorsStyles = StyleSheet.create({
  textWrapper: {
    ...flex.center,
    width: sizes.sm,
    height: sizes.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
  text: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default AnimatedPropertiesCard;
