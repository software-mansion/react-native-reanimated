/**
 * The original CSS implementation of this example can be found here:
 * https://codepen.io/anasalaoui/pen/zrVGoL?editors=1100
 */

import { Dimensions, StyleSheet, View } from 'react-native';
import { spacing } from '../../../../theme';
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

const COLORS = {
  purple: '#743388',
  darkPurple: '#272425',
  orange: '#EF8B32',
  red: '#E82134',
  bg: '#1D1D1D',
  gray: '#CCC',
  grayLighter: '#E0E0E0',
  grayLightest: '#F3F3F3',
  white: '#FFF',
};

const turbulenceAnimation: CSSAnimationConfig = {
  animationName: {
    '0%': {
      transform: 'scale(1) translate(0, 0) rotate(45deg)',
    },
    '50%': {
      transform: 'scale(1) translate(1px, -1px) rotate(45deg)',
    },
    '100%': {
      transform: 'scale(1) translate(0, 0) rotate(45deg)',
    },
  },
  animationDuration: '0.2s',
  animationIterationCount: 'infinite',
};

const hyperspaceAnimation: CSSAnimationConfig = {
  animationName: {
    from: {
      opacity: 1,
      transform: [{ scaleY: 0 }, { translateY: -200 }],
    },
    to: {
      opacity: 0,
      transform: [{ scaleY: 1 }, { translateY: 600 }],
    },
  },
  animationDuration: '0.4s',
  animationIterationCount: 'infinite',
  animationFillMode: 'both',
};

const mainFlameAnimation: CSSAnimationConfig = {
  animationName: {
    from: {
      transform: [{ translateY: 5 }],
    },
    to: {
      transform: [{ translateY: 0 }],
    },
  },
  animationDuration: '0.1s',
  animationTimingFunction: cubicBezier(0.175, 0.885, 0.42, 1.41),
  animationIterationCount: 'infinite',
};

const propulsedFlameAnimation: CSSAnimationConfig = {
  animationName: {
    from: {
      transform: [{ translateY: -10 }],
    },
    to: {
      transform: [{ translateY: 50 }, { scale: 0.7 }],
      opacity: 0,
    },
  },
  animationDuration: '0.3s',
  animationTimingFunction: 'easeIn',
  animationIterationCount: 'infinite',
};

const propulsedSparkAnimation: CSSAnimationConfig = {
  animationName: {
    from: {
      transform: [{ translateY: 0 }],
    },
    to: {
      transform: [{ translateY: 100 }],
      opacity: 0,
    },
  },
  animationDuration: '0.24s',
  animationTimingFunction: 'easeIn',
  animationIterationCount: 'infinite',
};

const STAR_POSITIONS = [
  { x: 50, y: -235 },
  { x: 120, y: -195 },
  { x: 25, y: -145 },
  { x: 105, y: -245 },
  { x: 150, y: -285 },
  { x: 20, y: -175 },
  { x: 75, y: -205 },
  { x: 85, y: -255 },
  { x: 150, y: -285 },
  { x: 20, y: -175 },
  { x: 75, y: -205 },
  { x: 85, y: -255 },
  { x: -30, y: -285 },
  { x: 200, y: -175 },
  { x: -75, y: -205 },
  { x: 275, y: -255 },
];

const EXHAUST_FLAME_POSITIONS = [
  { x: 10, y: 110 },
  { x: 35, y: 160 },
  { x: 50, y: 140 },
  { x: 70, y: 130 },
];

const SPARK_POSITIONS = [
  { x: 42, y: 150 },
  { x: -5, y: 80 },
  { x: 58, y: 100 },
];

export default function RocketInSpace() {
  return (
    <View style={styles.container}>
      <View style={styles.scene}>
        <Animated.View style={turbulenceAnimation}>
          <Svg style={styles.rocket}>
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={COLORS.grayLightest} />
                <Stop offset="65%" stopColor={COLORS.grayLightest} />
                <Stop offset="65%" stopColor={COLORS.grayLighter} />
                <Stop offset="100%" stopColor={COLORS.grayLighter} />
              </LinearGradient>
            </Defs>

            {/* Capsule base */}
            <Rect x="34" y="62" width="112" height="94" fill="url(#grad)" />

            {/* Capsule top */}
            <Polygon points="90 0, 34 62, 146 62" fill="url(#grad)" />

            {/* Window */}
            <Circle cx="90" cy="92" r="35" fill={COLORS.purple} />
            <Circle cx="90" cy="92" r="22" fill={COLORS.darkPurple} />

            {/* Exhaust */}
            <Polygon
              points="40 156, 49 179, 131 179, 140 156"
              fill={COLORS.purple}
            />

            {/* Wings */}
            <Polygon points="9 95, 33 80, 33 150, 0 160" fill={COLORS.purple} />
            <Polygon
              points="171 95, 147 80, 147 150, 180 160"
              fill={COLORS.purple}
            />
          </Svg>

          {/* Exhaust flame */}
          <ExhaustFlame x={50} y={100} />

          {/* Stars */}
          {STAR_POSITIONS.map((star, index) => (
            <Star key={index} {...star} delay={-index * 0.1} />
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

type StarProps = {
  x: number;
  y: number;
  delay: number;
};

function Star({ x, y, delay }: StarProps) {
  return (
    <Animated.View
      style={[
        styles.star,
        hyperspaceAnimation,
        {
          top: y,
          left: x,
          animationDelay: `${delay}s`,
        },
      ]}
    />
  );
}

type ExhaustFlameProps = {
  x: number;
  y: number;
};

function ExhaustFlame({ x, y }: ExhaustFlameProps) {
  return (
    <View style={[styles.exhaustFlame, { top: y, left: x }]}>
      {/* Sparks */}
      {EXHAUST_FLAME_POSITIONS.map((spark, index) => (
        <Spark
          key={index}
          {...spark}
          delay={-index * 0.1}
          color={index % 2 ? COLORS.orange : COLORS.red}
        />
      ))}

      {/* Main flame */}
      <Animated.View style={mainFlameAnimation}>
        <Flame width={80} height={200} />
      </Animated.View>

      {/* Small flames */}
      {SPARK_POSITIONS.map((flame, index) => (
        <Animated.View
          key={index}
          style={[
            propulsedFlameAnimation,
            {
              position: 'absolute',
              top: flame.y,
              left: flame.x,
              zIndex: index === 0 ? -1 : 1,
              animationDelay: `${-index * 0.2}s`,
            },
          ]}>
          <Flame width={20} height={40} />
        </Animated.View>
      ))}
    </View>
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
          <Stop offset="0" stopColor={COLORS.orange} />
          <Stop offset="50%" stopColor={COLORS.orange} />
          <Stop offset="50%" stopColor={COLORS.red} />
          <Stop offset="100%" stopColor={COLORS.red} />
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

type SparkProps = {
  x: number;
  y: number;
  delay: number;
  color: string;
};

function Spark({ x, y, delay, color }: SparkProps) {
  return (
    <Animated.View
      style={[
        styles.spark,
        propulsedSparkAnimation,
        {
          top: y,
          left: x,
          backgroundColor: color,
          animationDelay: `${delay}s`,
        },
      ]}
    />
  );
}

// TODO - maybe export StyleSheet from reanimated that accepts animations
const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bg,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scene: {
    padding: spacing.lg,
    paddingLeft: 100,
    paddingBottom: 80,
    transform: [{ scale: Dimensions.get('window').width / 375 }],
  },
  rocket: {
    width: 180,
    height: 179,
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 20,
    backgroundColor: COLORS.white,
  },
  exhaustFlame: {
    position: 'absolute',
    zIndex: -1,
  },
  spark: {
    position: 'absolute',
    width: 10,
    height: 10,
  },
});
