import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Polygon,
  Circle,
} from 'react-native-svg';
import { RouteCard } from '../../../components';
import type { RouteCardComponent } from '../../../components';
import { colors, sizes, flex } from '../../../theme';
import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import type { PropsWithChildren } from 'react';
import { useFocusPlayState } from './utils';

const TIME_MULTIPLIER = 1;

const turbulenceAnimation: CSSAnimationConfig = {
  animationName: {
    '0%': {
      transform: 'scale(1) translate(0, 0)',
    },
    '50%': {
      transform: 'scale(1) translate(1px, -1px)',
    },
    '100%': {
      transform: 'scale(1) translate(0, 0)',
    },
  },
  animationDuration: `${TIME_MULTIPLIER * 0.4}s`,
  animationIterationCount: 'infinite',
};

const mainFlameAnimation: CSSAnimationConfig = {
  animationName: {
    from: {
      transform: [{ translateY: '5%' }],
    },
    to: {
      transform: [{ translateY: 0 }],
    },
  },
  animationDuration: `${TIME_MULTIPLIER * 0.2}s`,
  // animationTimingFunction: 'cubic-bezier(0.175, 0.885, 0.42, 1.41)', // TODO - add this once timing functions are merged
  animationIterationCount: 'infinite',
};

const propulsedFlameAnimation: CSSAnimationConfig = {
  animationName: {
    from: {
      transform: [{ translateY: '-25%' }],
    },
    to: {
      transform: [{ translateY: '150%' }, { scale: 0.7 }],
      opacity: 0,
    },
  },
  animationDuration: `${TIME_MULTIPLIER * 0.6}s`,
  // animationTimingFunction: 'ease-in', // TODO - add this once timing functions are merged
  animationIterationCount: 'infinite',
};

const propulsedSparkAnimation: CSSAnimationConfig = {
  animationName: {
    from: {
      transform: [{ translateY: 0 }],
    },
    to: {
      transform: [{ translateY: '500%' }],
      opacity: 0,
    },
  },
  animationDuration: `${TIME_MULTIPLIER * 0.48}s`,
  // animationTimingFunction: 'ease-in', // TODO - add this once timing functions are merged
  animationIterationCount: 'infinite',
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
    description="Simple and complex animations that can be used in apps"
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
              <Flame width={sizes.xs} height={sizes.md} />
            </Animated.View>
            {/* Small flames */}
            {SMALL_FLAME_TRANSLATIONS.map((translation, index) => (
              <SmallFlame key={index} index={index} {...translation} />
            ))}
            {/* Sparks */}
            {SPARK_TRANSLATIONS.map((translation, index) => (
              <Spark key={index} index={index} {...translation} />
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
      style={{
        width: size,
        height: size,
      }}
      viewBox="0 0 180 179" // Set the fixed viewBox based on the original SVG dimensions
    >
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.background2} />
          <Stop offset="65%" stopColor={colors.background2} />
          <Stop offset="65%" stopColor={colors.background3} />
          <Stop offset="100%" stopColor={colors.background3} />
        </LinearGradient>
      </Defs>

      {/* Capsule base */}
      <Rect x="34" y="62" width="112" height="94" fill="url(#grad)" />

      {/* Capsule top */}
      <Polygon points="90 0, 34 62, 146 62" fill="url(#grad)" />

      {/* Window */}
      <Circle cx="90" cy="92" r="35" fill={colors.primary} />
      <Circle cx="90" cy="92" r="22" fill={colors.primaryDark} />

      {/* Exhaust */}
      <Polygon
        points="40 156, 49 179, 131 179, 140 156"
        fill={colors.primary}
      />

      {/* Wings */}
      <Polygon points="9 95, 33 80, 33 150, 0 160" fill={colors.primary} />
      <Polygon
        points="171 95, 147 80, 147 150, 180 160"
        fill={colors.primary}
      />
    </Svg>
  );
}

type FlameProps = {
  width: number;
  height: number;
};

function Flame({ width, height }: FlameProps) {
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.primaryLight} />
          <Stop offset="50%" stopColor={colors.primaryLight} />
          <Stop offset="50%" stopColor={colors.primaryDark} />
          <Stop offset="100%" stopColor={colors.primaryDark} />
        </LinearGradient>
      </Defs>
      <Polygon
        points={`0 ${height / 2}, ${width / 2} 0, ${width} ${height / 2}, ${
          width / 2
        } ${height}`}
        fill="url(#grad)"
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

function SmallFlame({ x, y, index, zIndex }: SmallFlameProps) {
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
        <Flame width={sizes.xxxs} height={sizes.xxs} />
      </Animated.View>
    </RelativeTransform>
  );
}

type SparkProps = {
  x: number;
  y: number;
  index: number;
};

function Spark({ x, y, index }: SparkProps) {
  return (
    <RelativeTransform x={x} y={y} zIndex={-1}>
      <Animated.View
        style={[
          propulsedSparkAnimation,
          styles.spark,
          {
            backgroundColor:
              index % 2 === 0 ? colors.primaryLight : colors.primaryDark,
            animationDelay: `${-index * 0.4 * TIME_MULTIPLIER}s`,
            animationPlayState: useFocusPlayState(),
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

function RelativeTransform({ x, y, zIndex, children }: RelativeTransformProps) {
  return (
    <View
      style={[
        {
          position: 'absolute',
          left: `${(x + 0.5) * 100}%`,
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
  scene: {
    transform: [
      { translateX: '10%' },
      { translateY: '-20%' },
      { rotate: '25deg' },
    ],
  },
  exhaustFlames: {
    position: 'absolute',
    left: '50%',
    top: '90%',
    transform: [{ translateX: '-50%' }, { translateY: '-25%' }],
    zIndex: -1,
  },
  spark: { width: 0.5 * sizes.xxxs, height: 0.5 * sizes.xxxs },
});

export default RealWorldExamplesCard;
