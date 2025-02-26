/**
 * The original CSS implementation of this example can be found here:
 * https://codepen.io/anasalaoui/pen/zrVGoL?editors=1100
 */

import { Dimensions, View } from 'react-native';
import Animated, { css, cubicBezier } from 'react-native-reanimated';
import {
  Circle,
  Defs,
  LinearGradient,
  Polygon,
  Rect,
  Stop,
  Svg,
} from 'react-native-svg';

import { Screen } from '@/apps/css/components';
import { spacing } from '@/theme';

const COLORS = {
  bg: '#1D1D1D',
  darkPurple: '#272425',
  gray: '#CCC',
  grayLighter: '#E0E0E0',
  grayLightest: '#F3F3F3',
  orange: '#EF8B32',
  purple: '#743388',
  red: '#E82134',
  white: '#FFF',
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
    <Screen style={styles.container}>
      <View style={styles.scene}>
        <Animated.View style={styles.turbulence}>
          <Svg style={styles.rocket}>
            <Defs>
              <LinearGradient id="rocket" x1="0" x2="1" y1="0" y2="0">
                <Stop offset="0" stopColor={COLORS.grayLightest} />
                <Stop offset="65%" stopColor={COLORS.grayLightest} />
                <Stop offset="65%" stopColor={COLORS.grayLighter} />
                <Stop offset="100%" stopColor={COLORS.grayLighter} />
              </LinearGradient>
            </Defs>

            {/* Capsule base */}
            <Rect fill="url(#rocket)" height="94" width="112" x="34" y="62" />

            {/* Capsule top */}
            <Polygon fill="url(#rocket)" points="90 0, 34 62, 146 62" />

            {/* Window */}
            <Circle cx="90" cy="92" fill={COLORS.purple} r="35" />
            <Circle cx="90" cy="92" fill={COLORS.darkPurple} r="22" />

            {/* Exhaust */}
            <Polygon
              fill={COLORS.purple}
              points="40 156, 49 179, 131 179, 140 156"
            />

            {/* Wings */}
            <Polygon fill={COLORS.purple} points="9 95, 33 80, 33 150, 0 160" />
            <Polygon
              fill={COLORS.purple}
              points="171 95, 147 80, 147 150, 180 160"
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
    </Screen>
  );
}

type StarProps = {
  x: number;
  y: number;
  delay: number;
};

function Star({ delay, x, y }: StarProps) {
  return (
    <Animated.View
      style={[
        styles.star,
        {
          animationDelay: `${delay}s`,
          left: x,
          top: y,
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
    <View style={[styles.exhaustFlame, { left: x, top: y }]}>
      {/* Sparks */}
      {EXHAUST_FLAME_POSITIONS.map((spark, index) => (
        <Spark
          key={index}
          {...spark}
          color={index % 2 ? COLORS.orange : COLORS.red}
          delay={-index * 0.1}
        />
      ))}

      {/* Main flame */}
      <Animated.View style={styles.mainFlame}>
        <Flame height={200} width={80} />
      </Animated.View>

      {/* Small flames */}
      {SPARK_POSITIONS.map((flame, index) => (
        <Animated.View
          key={index}
          style={[
            styles.propulsedFlame,
            {
              animationDelay: `${-index * 0.2}s`,
              left: flame.x,
              top: flame.y,
              zIndex: index === 0 ? -1 : 1,
            },
          ]}>
          <Flame height={40} width={20} />
        </Animated.View>
      ))}
    </View>
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
        <LinearGradient id="flame" x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor={COLORS.orange} />
          <Stop offset="50%" stopColor={COLORS.orange} />
          <Stop offset="50%" stopColor={COLORS.red} />
          <Stop offset="100%" stopColor={COLORS.red} />
        </LinearGradient>
      </Defs>
      <Polygon
        fill="url(#flame)"
        points={`0 ${height / 2}, ${width / 2} 0, ${width} ${height / 2}, ${
          width / 2
        } ${height}`}
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

function Spark({ color, delay, x, y }: SparkProps) {
  return (
    <Animated.View
      style={[
        styles.spark,
        {
          animationDelay: `${delay}s`,
          backgroundColor: color,
          left: x,
          top: y,
        },
      ]}
    />
  );
}

const turbulence = css.keyframes({
  '0%, 100%': {
    transform: 'rotate(45deg)',
  },
  '50%': {
    transform: 'translate(1px, -1px) rotate(45deg)',
  },
});

const hyperspace = css.keyframes({
  from: {
    opacity: 1,
    transform: [{ scaleY: 0 }, { translateY: -200 }],
  },
  to: {
    opacity: 0,
    transform: [{ scaleY: 1 }, { translateY: 600 }],
  },
});

const mainFlame = css.keyframes({
  from: {
    transform: [{ translateY: 5 }],
  },
  to: {
    transform: [{ translateY: 0 }],
  },
});

const propulsedFlame = css.keyframes({
  from: {
    transform: [{ translateY: -10 }],
  },
  to: {
    opacity: 0,
    transform: [{ translateY: 50 }, { scale: 0.7 }],
  },
});

const propulsedSpark = css.keyframes({
  from: {
    transform: [{ translateY: 0 }],
  },
  to: {
    opacity: 0,
    transform: [{ translateY: 100 }],
  },
});

const styles = css.create({
  container: {
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    flex: 1,
    justifyContent: 'center',
  },
  exhaustFlame: {
    position: 'absolute',
    zIndex: -1,
  },
  mainFlame: {
    animationDuration: '0.1s',
    animationIterationCount: 'infinite',
    animationName: mainFlame,
    animationTimingFunction: cubicBezier(0.175, 0.885, 0.42, 1.41),
  },
  propulsedFlame: {
    animationDuration: '0.3s',
    animationIterationCount: 'infinite',
    animationName: propulsedFlame,
    animationTimingFunction: 'ease-in',
    position: 'absolute',
  },
  rocket: {
    height: 179,
    width: 180,
  },
  scene: {
    padding: spacing.lg,
    paddingBottom: 80,
    paddingLeft: 100,
    transform: [{ scale: Math.min(Dimensions.get('window').width, 450) / 375 }],
  },
  spark: {
    animationDuration: '0.24s',
    animationIterationCount: 'infinite',
    animationName: propulsedSpark,
    animationTimingFunction: 'ease-in',
    height: 10,
    position: 'absolute',
    width: 10,
  },
  star: {
    animationDuration: '0.4s',
    animationFillMode: 'both',
    animationIterationCount: 'infinite',
    animationName: hyperspace,
    backgroundColor: COLORS.white,
    height: 20,
    position: 'absolute',
    width: 4,
  },
  turbulence: {
    animationDuration: '0.2s',
    animationIterationCount: 'infinite',
    animationName: turbulence,
  },
});
