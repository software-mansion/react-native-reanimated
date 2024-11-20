import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import Animated, { cubicBezier } from 'react-native-reanimated';
import {
  Circle,
  Defs,
  LinearGradient,
  Polygon,
  Rect,
  Stop,
  Svg,
} from 'react-native-svg';

import type { RouteCardComponent } from '@/components';
import { RouteCard } from '@/components';
import { useFocusPlayState } from '@/hooks';
import { colors, flex, sizes } from '@/theme';

const TIME_MULTIPLIER = 1;

const turbulenceAnimation: CSSAnimationConfig = {
  animationDuration: `${TIME_MULTIPLIER * 0.4}s`,
  animationIterationCount: 'infinite',
  animationName: {
    '0%, 100%': {
      transform: 'scale(1) translate(0, 0)',
    },
    '50%': {
      transform: 'scale(1) translate(1px, -1px)',
    },
  },
};

const mainFlameAnimation: CSSAnimationConfig = {
  animationDuration: `${TIME_MULTIPLIER * 0.2}s`,
  animationIterationCount: 'infinite',
  animationName: {
    from: {
      transform: [{ translateY: '5%' }],
    },
    to: {
      transform: [{ translateY: 0 }],
    },
  },
  animationTimingFunction: cubicBezier(0.175, 0.885, 0.42, 1.41),
};

const propulsedFlameAnimation: CSSAnimationConfig = {
  animationDuration: `${TIME_MULTIPLIER * 0.6}s`,
  animationIterationCount: 'infinite',
  animationName: {
    from: {
      transform: [{ translateY: '-25%' }],
    },
    to: {
      opacity: 0,
      transform: [{ translateY: '150%' }, { scale: 0.7 }],
    },
  },
  animationTimingFunction: 'easeIn',
};

const propulsedSparkAnimation: CSSAnimationConfig = {
  animationDuration: `${TIME_MULTIPLIER * 0.48}s`,
  animationIterationCount: 'infinite',
  animationName: {
    from: {
      transform: [{ translateY: 0 }],
    },
    to: {
      opacity: 0,
      transform: [{ translateY: '500%' }],
    },
  },
  animationTimingFunction: 'easeIn',
};

const SMALL_FLAME_TRANSLATIONS = [
  { x: -0.35, y: 0.5 },
  { x: 0.45, y: 0.5, zIndex: -1 },
  { x: 0.1, y: 0.6 },
];

const SPARK_TRANSLATIONS = [
  { x: -0.5, y: 0.6 },
  { x: -0.1, y: 0.75 },
  { x: 0.1, y: 0.9 },
  { x: 0.25, y: 0.65 },
];

const RealWorldExamplesCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Simple and complex **animations** that can be **used in apps**"
    showcaseScale={1.5}>
    <Showcase />
  </RouteCard>
);

function Showcase() {
  return (
    <View style={flex.row}>
      <Animated.View
        style={[
          turbulenceAnimation,
          { animationPlayState: useFocusPlayState() },
        ]}>
        <View style={styles.scene}>
          {/* Rocket capsule */}
          <Rocket size={sizes.lg} />
          {/* Exhaust flames and sparks */}
          <View style={styles.exhaustFlames}>
            {/* Main flame */}
            <Animated.View
              style={[
                mainFlameAnimation,
                { animationPlayState: useFocusPlayState() },
              ]}>
              <Flame height={sizes.md} width={sizes.xs} />
            </Animated.View>
            {/* Small flames */}
            {SMALL_FLAME_TRANSLATIONS.map((translation, index) => (
              <SmallFlame index={index} key={index} {...translation} />
            ))}
            {/* Sparks */}
            {SPARK_TRANSLATIONS.map((translation, index) => (
              <Spark index={index} key={index} {...translation} />
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

type RocketProps = {
  size: number;
};

function Rocket({ size }: RocketProps) {
  return (
    <Svg
      viewBox="0 0 180 179" // Set the fixed viewBox based on the original SVG dimensions
      style={{
        height: size,
        width: size,
      }}>
      <Defs>
        <LinearGradient id="grad" x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor={colors.background2} />
          <Stop offset="65%" stopColor={colors.background2} />
          <Stop offset="65%" stopColor={colors.background3} />
          <Stop offset="100%" stopColor={colors.background3} />
        </LinearGradient>
      </Defs>

      {/* Capsule base */}
      <Rect fill="url(#grad)" height="94" width="112" x="34" y="62" />

      {/* Capsule top */}
      <Polygon fill="url(#grad)" points="90 0, 34 62, 146 62" />

      {/* Window */}
      <Circle cx="90" cy="92" fill={colors.primary} r="35" />
      <Circle cx="90" cy="92" fill={colors.primaryDark} r="22" />

      {/* Exhaust */}
      <Polygon
        fill={colors.primary}
        points="40 156, 49 179, 131 179, 140 156"
      />

      {/* Wings */}
      <Polygon fill={colors.primary} points="9 95, 33 80, 33 150, 0 160" />
      <Polygon
        fill={colors.primary}
        points="171 95, 147 80, 147 150, 180 160"
      />
    </Svg>
  );
}

type FlameProps = {
  width: number;
  height: number;
};

function Flame({ height, width }: FlameProps) {
  return (
    <Svg height={height} width={width}>
      <Defs>
        <LinearGradient id="grad" x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor={colors.primaryLight} />
          <Stop offset="50%" stopColor={colors.primaryLight} />
          <Stop offset="50%" stopColor={colors.primaryDark} />
          <Stop offset="100%" stopColor={colors.primaryDark} />
        </LinearGradient>
      </Defs>
      <Polygon
        fill="url(#grad)"
        points={`0 ${height / 2}, ${width / 2} 0, ${width} ${height / 2}, ${
          width / 2
        } ${height}`}
      />
    </Svg>
  );
}

type SmallFlameProps = {
  x: number;
  y: number;
  index: number;
  zIndex?: number;
};

function SmallFlame({ index, x, y, zIndex }: SmallFlameProps) {
  return (
    <RelativeTransform x={x} y={y} zIndex={zIndex}>
      <Animated.View
        style={[
          propulsedFlameAnimation,
          {
            animationDelay: `${-index * 0.24 * TIME_MULTIPLIER}s`,
            animationPlayState: useFocusPlayState(),
          },
        ]}>
        <Flame height={sizes.xxs} width={sizes.xxxs} />
      </Animated.View>
    </RelativeTransform>
  );
}

type SparkProps = {
  x: number;
  y: number;
  index: number;
};

function Spark({ index, x, y }: SparkProps) {
  return (
    <RelativeTransform x={x} y={y} zIndex={-1}>
      <Animated.View
        style={[
          propulsedSparkAnimation,
          styles.spark,
          {
            animationDelay: `${-index * 0.4 * TIME_MULTIPLIER}s`,
            animationPlayState: useFocusPlayState(),
            backgroundColor:
              index % 2 === 0 ? colors.primaryLight : colors.primaryDark,
          },
        ]}
      />
    </RelativeTransform>
  );
}

type RelativeTransformProps = PropsWithChildren<{
  x: number;
  y: number;
  zIndex?: number;
}>;

function RelativeTransform({ children, x, y, zIndex }: RelativeTransformProps) {
  return (
    <View
      style={[
        {
          left: `${(x + 0.5) * 100}%`,
          position: 'absolute',
          top: `${y * 100}%`,
          transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
          zIndex,
        },
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  exhaustFlames: {
    left: '50%',
    position: 'absolute',
    top: '90%',
    transform: [{ translateX: '-50%' }, { translateY: '-25%' }],
    zIndex: -1,
  },
  scene: {
    transform: [
      { translateX: '10%' },
      { translateY: '-20%' },
      { rotate: '25deg' },
    ],
  },
  spark: { height: 0.5 * sizes.xxxs, width: 0.5 * sizes.xxxs },
});

export default RealWorldExamplesCard;
