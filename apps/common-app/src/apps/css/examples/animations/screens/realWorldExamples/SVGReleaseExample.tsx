/**
 * Countdown animation (3, 2, 1, 4.3.0!) — a React Native recreation of
 * https://codepen.io/suez/pen/dXbBGp using CSS animations from reanimated and
 * SVG from react-native-svg.
 */
import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { css } from 'react-native-reanimated';
import {
  Defs,
  LinearGradient,
  Path as SvgPath,
  Rect,
  Svg,
  Text as SvgText,
} from 'react-native-svg';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedPath = Animated.createAnimatedComponent(SvgPath);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

const BG_COLOR = '#0A1628';
const WHEEL_1 = '#113E60';
const WHEEL_2 = '#5F9CC0';
const WHEEL_3 = '#C1E0F1';

const SIZE = 140;
const SIZE_BIG = 300;
const PAD = 10;
const NUM_SIZE = 100;
const CONT_BR = 20;
const DURATION: `${number}s` = '4s';
const WHEEL_SIZE = SIZE_BIG * 2;

const num1Len = 72.1554946899414;
const num2Len = 136.02162170410156;
const num3Len = 144.4256591796875;
const numJoin12 = 82.63925170898438;
const numJoin23 = 42.81303787231445;
const numJoin30 = 40;
const totalLen =
  num1Len + num2Len + num3Len + numJoin12 + numJoin23 + numJoin30;

const offset3 = -numJoin30;
const offset2 = -(num3Len + numJoin23 + numJoin30);
const offset1 = -(num3Len + numJoin23 + num2Len + numJoin12 + numJoin30);

const NUMBERS_PATH =
  'M-10,20 60,20 40,50 a18,15 0 1,1 -12,19 ' +
  'Q25,44 34.4,27.4 ' +
  'l7,-7 a16,16 0 0,1 22.6,22.6 l-30,30 l35,0 L69,73 ' +
  'a20,10 0 0,1 20,10 a17,17 0 0,1 -34,0 L55,83 ' +
  'l0,-61 L40,28';

// Color wheel pie sectors (3 × 120°)
const S = (Math.sqrt(3) / 2).toFixed(4);
const SECTOR_1 = `M0,0 L1,0 A1,1,0,0,1,-0.5,${S} Z`;
const SECTOR_2 = `M0,0 L-0.5,${S} A1,1,0,0,1,-0.5,-${S} Z`;
const SECTOR_3 = `M0,0 L-0.5,-${S} A1,1,0,0,1,1,0 Z`;

// Number stroke animation (animatedProps for SVG Path)
const svgNumberAnim = {
  animationDuration: DURATION,
  animationFillMode: 'forwards' as const,
  animationName: {
    '0%': { strokeDasharray: [0, totalLen], strokeDashoffset: 0 },
    '100%': {
      opacity: 0,
      strokeDasharray: [num1Len, totalLen],
      strokeDashoffset: offset1,
    },
    '15%': {
      strokeDasharray: [0, totalLen],
      strokeDashoffset: 0,
    },
    '25%': {
      strokeDasharray: [num3Len, totalLen],
      strokeDashoffset: offset3,
    },
    '41%': {
      strokeDasharray: [num3Len, totalLen],
      strokeDashoffset: offset3,
    },
    '53%': {
      strokeDasharray: [num2Len, totalLen],
      strokeDashoffset: offset2,
    },
    '66%': {
      strokeDasharray: [num2Len, totalLen],
      strokeDashoffset: offset2,
    },
    '76%': {
      strokeDasharray: [num1Len + numJoin12 / 2, totalLen],
      strokeDashoffset: offset1,
    },
    '88%': {
      strokeDasharray: [num1Len, totalLen],
      strokeDashoffset: offset1,
    },
    '92%': {
      opacity: 1,
      strokeDasharray: [num1Len, totalLen],
      strokeDashoffset: offset1,
    },
  },
  animationTimingFunction: 'ease-in-out' as const,
};

const svgGlowGradientAnim = {
  animationDuration: '9s',
  animationIterationCount: 'infinite' as const,
  animationName: {
    '0%': {
      gradient: [
        { color: WHEEL_2, offset: '0%', opacity: 0.18 },
        { color: WHEEL_1, offset: '22%', opacity: 0.1 },
        { color: WHEEL_2, offset: '46%', opacity: 0.14 },
        { color: WHEEL_1, offset: '78%', opacity: 0.06 },
        { color: WHEEL_1, offset: '100%', opacity: 0.0 },
      ],
    },
    '100%': {
      gradient: [
        { color: WHEEL_2, offset: '0%', opacity: 0.18 },
        { color: WHEEL_1, offset: '22%', opacity: 0.1 },
        { color: WHEEL_2, offset: '46%', opacity: 0.14 },
        { color: WHEEL_1, offset: '78%', opacity: 0.06 },
        { color: WHEEL_1, offset: '100%', opacity: 0.0 },
      ],
    },
    '25%': {
      gradient: [
        { color: WHEEL_2, offset: '0%', opacity: 0.18 },
        { color: WHEEL_1, offset: '28%', opacity: 0.1 },
        { color: WHEEL_2, offset: '52%', opacity: 0.14 },
        { color: WHEEL_1, offset: '76%', opacity: 0.06 },
        { color: WHEEL_1, offset: '100%', opacity: 0.0 },
      ],
    },
    '50%': {
      gradient: [
        // Narrow phase: keep most of it dark, with a single brighter highlight.
        { color: WHEEL_2, offset: '0%', opacity: 0.18 },
        { color: WHEEL_1, offset: '40%', opacity: 0.08 },
        { color: WHEEL_3, offset: '52%', opacity: 0.24 },
        { color: WHEEL_1, offset: '64%', opacity: 0.07 },
        { color: WHEEL_1, offset: '100%', opacity: 0.0 },
      ],
    },
    '75%': {
      gradient: [
        { color: WHEEL_2, offset: '0%', opacity: 0.18 },
        { color: WHEEL_1, offset: '26%', opacity: 0.1 },
        { color: WHEEL_2, offset: '50%', opacity: 0.14 },
        { color: WHEEL_1, offset: '76%', opacity: 0.06 },
        { color: WHEEL_1, offset: '100%', opacity: 0.0 },
      ],
    },
  },
  animationTimingFunction: 'ease-in-out' as const,
} as AnimatedLinearGradientProps['animatedProps'];

type AnimatedLinearGradientProps = React.ComponentProps<
  typeof AnimatedLinearGradient
>;

const word = 'Reanimated';

const GLYPH_COUNT = word.length;
const SKEW_ROTATE_DEG = 20;
// Hidden glyphs move above the SVG viewport so they appear to drop in.
const HIDDEN_DY = -40;

const rotateAt = (revealedCount: number): Array<number> => [
  ...Array.from({ length: revealedCount }, () => 0),
  ...Array.from({ length: GLYPH_COUNT - revealedCount }, () => SKEW_ROTATE_DEG),
];

const dyAt = (visibleCount: number): Array<number> => [
  ...Array.from({ length: visibleCount }, () => 0),
  ...Array.from({ length: GLYPH_COUNT - visibleCount }, () => HIDDEN_DY),
];

const svgWordRotateAnim = {
  animationDelay: 3650,
  animationDuration: '1s',
  animationFillMode: 'forwards',
  animationName: {
    '0%': { dy: dyAt(0), rotate: rotateAt(0) },
    '10%': { dy: dyAt(1), rotate: rotateAt(1) },
    '100%': { dy: dyAt(10), rotate: rotateAt(10) },
    '20%': { dy: dyAt(2), rotate: rotateAt(2) },
    '30%': { dy: dyAt(3), rotate: rotateAt(3) },
    '40%': { dy: dyAt(4), rotate: rotateAt(4) },
    '50%': { dy: dyAt(5), rotate: rotateAt(5) },
    '60%': { dy: dyAt(6), rotate: rotateAt(6) },
    '70%': { dy: dyAt(7), rotate: rotateAt(7) },
    '80%': { dy: dyAt(8), rotate: rotateAt(8) },
    '90%': { dy: dyAt(9), rotate: rotateAt(9) },
  },
};

type AnimatedSvgTextProps = React.ComponentProps<typeof AnimatedSvgText>;
const svgWordRotateAnimTyped =
  svgWordRotateAnim as AnimatedSvgTextProps['animatedProps'];

export default function EmptyExample() {
  const { height: screenHeight } = useWindowDimensions();

  // Keep the wheel "stage" vertically centered, then anchor the horse + word
  // relative to it using screen height.
  const HORSE_SIZE = 320;
  const WORD_SIZE = 95;
  // Positive values move the horse downward into the wheel stage.
  // Negative values push it upward (away from the stage).
  const horseStageOverlapPx = -10;
  // Gap (px) between the wheel stage and the bottom word.
  const wordGapAfterStagePx = 65;

  const stageTop = screenHeight / 2 - SIZE / 2;
  const horseTop = Math.max(0, stageTop + horseStageOverlapPx - HORSE_SIZE);
  const wordBottomRaw =
    screenHeight / 2 - SIZE / 2 - wordGapAfterStagePx - WORD_SIZE;
  const wordBottom = Math.max(
    0,
    Math.min(wordBottomRaw, screenHeight - WORD_SIZE)
  );

  return (
    <View style={styles.screen}>
      {/* Background gradient glow */}
      <Animated.View style={styles.absoluteFill}>
        <Svg
          height="100%"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 100 100"
          width="100%">
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore react-native-svg web typings for Defs are missing children */}
          <Defs>
            <AnimatedLinearGradient
              animatedProps={svgGlowGradientAnim}
              gradientUnits="objectBoundingBox"
              id="bgGrad"
              x1="0%"
              x2="100%"
              y1="0%"
              y2="100%"
            />
          </Defs>
          <Rect fill="url(#bgGrad)" height="100%" width="100%" />
        </Svg>
      </Animated.View>

      <AnimatedSvg
        height={320}
        style={[styles.horse, { top: horseTop }]}
        viewBox="0 0 400 330"
        width={320}>
        <AnimatedPath
          d="M316.96 73.1c-.142-1.576-.194-4.1.54-4.1 1 0 4.5 0 5.5 1 1.5 1.167 4.7 3.6 5.5 4 1 .5 14 7 18 13s13.5 16 16 18 7 5.5 7 7-1.5 3-1.5 3.5-.5 3-3 4-5.5 1.5-8.5 0-15-6.5-23-9-16.5-2-19 3-13 24-15.5 26c.333 4.5.7 14-.5 16-1.5 2.5-4 8-4.5 9.5-.4 1.2.5 2.833 1 3.5 4.667.5 14.7 1.5 17.5 1.5 3.5 0 9-.5 11.5 3.5.5 1.333 1.2 4.6 0 7 .5.667 2.2 2.2 5 3s3.833 2 4 2.5c5 5.167 16.2 15.9 21 17.5.667.333 2.2 1.6 3 4s2.667 4.667 3.5 5.5c2.5 3.167 7.6 9.6 8 10 .5.5 0 1.5-.5 1.5s-8 .5-11-1.5c-2.4-1.6-2.667-5.333-2.5-7 0-1-.2-3.1-1-3.5-1-.5-5.5-1.5-5.5-2.5s-1-4.5-3.5-6-11.5-11.5-14-11.5-12-2-13-2c-.8 0-2.333.667-3 1-3 5.167-9.2 15.9-10 17.5-1 2-2.5 4.5-3 5s-10.5 4-13.5 5-6.5 3-7.5 2.5c-.8-.4.667-5.5 1.5-8 1.333-1.667 4.4-5 6-5s3 .333 3.5.5c.333.667 1.4 1.8 3 1 2-1 1-4 2-4.5s6.5-5.5 9.5-11c2.4-4.4 2-4.833 1.5-4.5-3.833-.333-11.7-1-12.5-1-1 0-16-1-17-1.5-.8-.4-3.667.5-5 1-6.333 1-21.4 2.6-31 1-12-2-27-1-29.5-1s-19.5-4-21-4.5c-1.2-.4-2.167-.167-2.5 0 1 4.167 3.2 13 4 15 1 2.5 12.5 15 24.5 19.5s16 6.5 19 6.5c.333.167 1.1.6 1.5 1 .5.5 9 1.5 12 2.5 2.4.8 2.333 1.667 2 2-.667 1.167-2.6 3.7-5 4.5q-4.5 1.5-6 1.5c-1 0-6-3-7-4.5-.8-1.2-2.667-1.5-3.5-1.5-.167.5-.6 1.5-1 1.5-.5 0-4.5-1.5-6-2.5s-23-13-24.5-13-7.5-2.5-12-4-3.5-6.5-4.5-8.5-8.5-16-11-17.5c-2-1.2-4.833-2.167-6-2.5-2.833 2.667-8.7 8.1-9.5 8.5-1 .5-3.5 9.5-3.5 11s-10.5 17-11.5 18-1 8.5-.5 10.5 7 20 10.5 22 13.5 2 14.5 2 4 3.5 4.5 4.5c.4.8 1.167 3.333 1.5 4.5-1.167.333-4 1-6 1-2.5 0-19.5-3.5-20.5-4.5s-1.5-7.5-2-7.5-12.5-26-13.5-27.5-3.5-5.5-3.5-7 3-8 6-10.5 7-15 7-16.5-2-5.5-5-8.5-13.5-22.5-14.5-30.5c-.8-6.4 3-14.667 5-18l-.5-1c-5.333.833-16.3 2.7-17.5 3.5-1.5 1-7.5 5-4 9.5-4.167-.833-10-.5-15.5-3.5-3.776-2.06-8.5 2.451-9.5 3.5-6.833 7.167-22.4 22.6-30 27 1.167-1.167 3.7-4.4 4.5-8-1.5 2.333-8 8.3-22 13.5 5.667-5.167 16.7-17.5 15.5-25.5L45 152c0 .333-1.1.8-5.5 0 2.833-1.5 9.8-5.6 15-10C61 136.5 68 129.5 72 129s28-1 33.5-1 15.5.5 18.5-1 27-16.5 40-14 41 9.5 63 6 39-10 41.5-12c2-1.6 4.167-3.667 5-4.5-2.167.5-7.1 1.5-9.5 1.5 4.167-1.667 13.1-5.3 15.5-6.5-1 0-3.4-.1-5-.5 5.333-2 16.7-6.4 19.5-8-1.167 0-4.6-.6-9-3 4.667-.333 14.9-1.6 18.5-4s1.5-1.667 0-1c-1.667.333-5.9.5-9.5-1.5 5.167-1.5 16.3-4.8 19.5-6 2.351-.882 3.227-.738 3.46-.4"
          fill="none"
          stroke="white"
          strokeDasharray={1600}
          strokeDashoffset={1600}
          strokeWidth={6}
          animatedProps={{
            animationDelay: 3650,
            animationDuration: '0.75s',
            animationFillMode: 'both',
            animationName: {
              to: { strokeDashoffset: 0 },
            },
            animationTimingFunction: 'ease-in',
          }}
        />
      </AnimatedSvg>

      <View style={styles.stage}>
        <Animated.View style={styles.widthWrapper}>
          <Animated.View style={styles.shapeWrapper}>
            <Animated.View style={styles.wheelRotater}>
              <Svg height={WHEEL_SIZE} viewBox="-1 -1 2 2" width={WHEEL_SIZE}>
                <SvgPath d={SECTOR_1} fill={WHEEL_1} />
                <SvgPath d={SECTOR_2} fill={WHEEL_2} />
                <SvgPath d={SECTOR_3} fill={WHEEL_3} />
              </Svg>
            </Animated.View>
            <Animated.View style={styles.innerBg} />
          </Animated.View>
        </Animated.View>

        {/* "4.3.0" text — absolute overlay inside the stage */}
        <View pointerEvents="none" style={styles.overlay}>
          <Animated.Text style={styles.versionText}>4.3.0</Animated.Text>
        </View>

        {/* Countdown numbers — absolute overlay inside the stage */}
        <View pointerEvents="none" style={styles.overlay}>
          <Svg height={NUM_SIZE} viewBox="0 0 100 100" width={NUM_SIZE}>
            <AnimatedPath
              animatedProps={svgNumberAnim}
              d={NUMBERS_PATH}
              fill="none"
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={10}
            />
          </Svg>
        </View>
      </View>

      <View
        pointerEvents="none"
        style={[styles.reanimatedWordWrapper, { bottom: wordBottom }]}>
        <Svg height={95} viewBox="0 0 320 95" width={320}>
          <AnimatedSvgText
            animatedProps={svgWordRotateAnimTyped}
            dy={-110}
            fill="#fff"
            fontSize={52}
            fontWeight="bold"
            textAnchor="middle"
            x={160}
            y={70}>
            {word}
          </AnimatedSvgText>
        </Svg>
      </View>
    </View>
  );
}

const styles = css.create({
  absoluteFill: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  horse: {
    left: '50%',
    marginLeft: -160, // horse SVG is 320x320
    position: 'absolute',
    zIndex: 0,
  },
  innerBg: {
    // Inner background border radius morph
    animationDuration: DURATION,
    animationName: {
      '0%': { borderRadius: Math.max(CONT_BR - PAD, 0) },
      '100%': { borderRadius: Math.max(CONT_BR - PAD, 0) },
      '15%': { borderRadius: Math.max(CONT_BR - PAD, 0) },
      '30%': { borderRadius: Math.max(SIZE / 2 - PAD, 0) },
      '43%': { borderRadius: Math.max(SIZE / 2 - PAD, 0) },
      '52%': { borderRadius: 0 },
      '65%': { borderRadius: 0 },
      '78%': { borderRadius: Math.max(SIZE / 2 - PAD, 0) },
      '90%': { borderRadius: Math.max(SIZE / 2 - PAD, 0) },
    },
    animationTimingFunction: 'ease-in-out',
    backgroundColor: BG_COLOR,
    borderRadius: Math.max(CONT_BR - PAD, 0),
    bottom: PAD,
    left: PAD,
    position: 'absolute',
    right: PAD,
    top: PAD,
  },
  overlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  reanimatedWordWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    left: '50%',
    marginLeft: -160, // word SVG is 320x95
    position: 'absolute',
    zIndex: 1,
  },
  screen: {
    alignItems: 'center',
    backgroundColor: BG_COLOR,
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  shapeWrapper: {
    // Border radius + rotation morph
    animationDuration: DURATION,
    animationName: {
      '0%': {
        borderRadius: CONT_BR,
        opacity: 0,
        transform: [{ rotate: '0deg' }],
      },
      '100%': { borderRadius: CONT_BR, transform: [{ rotate: '1440deg' }] },
      '15%': {
        borderRadius: CONT_BR,
        opacity: 0,
        transform: [{ rotate: '0deg' }],
      },
      '30%': {
        borderRadius: SIZE / 2,
        opacity: 1,
        transform: [{ rotate: '360deg' }],
      },
      '43%': { borderRadius: SIZE / 2, transform: [{ rotate: '360deg' }] },
      '52%': { borderRadius: 0, transform: [{ rotate: '720deg' }] },
      '65%': { borderRadius: 0, transform: [{ rotate: '720deg' }] },
      '78%': { borderRadius: SIZE / 2, transform: [{ rotate: '1080deg' }] },
      '90%': { borderRadius: SIZE / 2, transform: [{ rotate: '1080deg' }] },
    },
    animationTimingFunction: 'ease-in-out',
    borderRadius: CONT_BR,
    flex: 1,
    overflow: 'hidden',
  },
  stage: {
    alignItems: 'center',
    height: SIZE,
    justifyContent: 'center',
    position: 'relative',
    width: SIZE_BIG,
    // Keep the wheel above the overlapping horse/word.
    zIndex: 2,
  },
  versionText: {
    // Version text fade
    animationDuration: DURATION,
    animationName: {
      '100%': { opacity: 1 },
      'from, 96%': { opacity: 0 },
    },
    color: '#fff',
    fontSize: 100,
    letterSpacing: 5,
  },
  wheelRotater: {
    // Wheel rotation
    animationDuration: '1.3s',
    animationIterationCount: 'infinite',
    animationName: {
      from: { transform: [{ rotate: '0deg' }] },
      to: { transform: [{ rotate: '360deg' }] },
    },
    animationTimingFunction: 'linear',
    height: WHEEL_SIZE,
    left: '50%',
    marginLeft: -WHEEL_SIZE / 2,
    marginTop: -WHEEL_SIZE / 2,
    position: 'absolute',
    top: '50%',
    width: WHEEL_SIZE,
  },
  widthWrapper: {
    // Outer container width morph
    animationDuration: DURATION,
    animationName: {
      '100%': { width: SIZE_BIG },
      'from, 90%': { width: SIZE },
    },
    animationTimingFunction: 'ease',
    height: SIZE,
    width: SIZE_BIG,
  },
});
