/**
 * The original CSS implementation of this example can be found here:
 * https://codepen.io/AshBardhan/pen/dNKwXz?editors=1100
 */

import { faHeart, faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { ComponentType } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { css } from 'react-native-reanimated';
import {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
  Svg,
} from 'react-native-svg';

import { Grid, ScrollScreen, Stagger, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';

const WINDOW_WIDTH = Dimensions.get('window').width;
const EMOJI_SIZE = 0.2 * WINDOW_WIDTH;

const COLORS = {
  base: '#f7d154',
  baseTransparent: 'rgba(247, 209, 84, 0.01)',
  black: '#000000',
  blue: '#548dff',
  red: '#f55064',
  white: '#ffffff',
};

export default function Emojis() {
  return (
    <ScrollScreen contentContainerStyle={{ paddingVertical: spacing.lg }}>
      <Grid
        columnGap={spacing.sm}
        columns={3}
        rowGap={spacing.md}
        staggerInterval={100}>
        <Example Emoji={LikeEmoji} title="Like" />
        <Example Emoji={HeartEmoji} title="Heart" />
        <Example Emoji={HaHaEmoji} title="HaHa" />
        <Example Emoji={YayEmoji} title="Yay" />
        <Example Emoji={WowEmoji} title="Wow" />
        <Example Emoji={SadEmoji} title="Sad" />
        <Example Emoji={AngryEmoji} title="Angry" />
      </Grid>
    </ScrollScreen>
  );
}

type ExampleProps = {
  title: string;
  Emoji: ComponentType;
};

function Example({ Emoji, title }: ExampleProps) {
  return (
    <View style={sharedStyles.cell}>
      <Stagger delay={50}>
        <Emoji />
        <Text variant="label2">{title}</Text>
      </Stagger>
    </View>
  );
}

const sharedStyles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    backgroundColor: colors.background1,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.sm,
    width: '100%',
  },
  emoji: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: EMOJI_SIZE,
    justifyContent: 'center',
    width: EMOJI_SIZE,
  },
});

function LikeEmoji() {
  return (
    <View style={likeStyles.emoji}>
      <Animated.View style={likeStyles.icon}>
        <FontAwesomeIcon
          color={COLORS.white}
          icon={faThumbsUp}
          size={0.6 * EMOJI_SIZE}
        />
      </Animated.View>
    </View>
  );
}

const like = css.keyframes({
  '25%': {
    transform: [{ rotate: '15deg' }],
  },
  '50%': {
    transform: [{ rotate: '-15deg' }, { translateY: -10 }],
  },
  '75%, 100%': {
    transform: [{ rotate: '0deg' }],
  },
});

const likeStyles = css.create({
  emoji: {
    ...sharedStyles.emoji,
    backgroundColor: COLORS.blue,
  },
  icon: {
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationName: like,
    animationTimingFunction: 'linear',
    transformOrigin: '0% 50%',
  },
});

function HeartEmoji() {
  return (
    <View style={heartStyles.emoji}>
      <Animated.View style={heartStyles.icon}>
        <FontAwesomeIcon
          color={COLORS.white}
          icon={faHeart}
          size={0.6 * EMOJI_SIZE}
        />
      </Animated.View>
    </View>
  );
}

const heart = css.keyframes({
  '25%': {
    transform: [{ scale: 1.1 }],
  },
  '75%': {
    transform: [{ scale: 0.6 }],
  },
});

const heartStyles = css.create({
  emoji: {
    ...sharedStyles.emoji,
    backgroundColor: COLORS.red,
  },
  icon: {
    animationDirection: 'alternate',
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationName: heart,
    animationTimingFunction: 'linear',
  },
});

function HaHaEmoji() {
  return (
    <View style={hahaStyles.emoji}>
      <Animated.View style={hahaStyles.face}>
        <View style={hahaStyles.eyes}>
          <View>
            <View
              style={[hahaStyles.eye, { transform: [{ rotate: '20deg' }] }]}
            />
            <View
              style={[hahaStyles.eye, { transform: [{ rotate: '-20deg' }] }]}
            />
          </View>

          <View>
            <View
              style={[hahaStyles.eye, { transform: [{ rotate: '-20deg' }] }]}
            />
            <View
              style={[hahaStyles.eye, { transform: [{ rotate: '20deg' }] }]}
            />
          </View>
        </View>

        <Animated.View style={hahaStyles.mouth}>
          <View style={hahaStyles.tongue} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const hahaFace = css.keyframes({
  '10%, 30%, 50%': {
    transform: [{ translateY: '25%' }],
  },
  '20%, 40%': {
    transform: [{ translateY: '15%' }],
  },
  '60%, 80%': {
    transform: [{ translateY: 0 }],
  },
  '70%, 90%': {
    transform: [{ translateY: '-10%' }],
  },
});

const hahaMouth = css.keyframes({
  '10%, 30%, 50%': {
    transform: [{ scale: 0.6 }],
  },
  '20%, 40%': {
    transform: [{ scale: 0.8 }],
  },
  '60%, 80%': {
    transform: [{ scale: 1 }],
  },
  '70%': {
    transform: [{ scale: 1.2 }],
  },
  '90%': {
    transform: [{ scale: 1.1 }],
  },
});

const hahaStyles = css.create({
  emoji: {
    ...sharedStyles.emoji,
    backgroundColor: COLORS.base,
  },
  eye: {
    backgroundColor: COLORS.black,
    borderRadius: radius.full,
    height: 0.055 * EMOJI_SIZE,
    width: 0.225 * EMOJI_SIZE,
  },
  eyes: {
    flexDirection: 'row',
    gap: 0.2 * EMOJI_SIZE,
  },
  face: {
    alignItems: 'center',
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationName: hahaFace,
    animationTimingFunction: 'linear',
    gap: 0.15 * EMOJI_SIZE,
  },
  mouth: {
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationName: hahaMouth,
    animationTimingFunction: 'linear',
    backgroundColor: COLORS.black,
    borderBottomLeftRadius: radius.full,
    borderBottomRightRadius: radius.full,
    height: 0.3 * EMOJI_SIZE,
    overflow: 'hidden',
    width: 0.6 * EMOJI_SIZE,
  },
  tongue: {
    backgroundColor: COLORS.red,
    borderRadius: '50%',
    bottom: '-50%',
    height: 0.5 * EMOJI_SIZE,
    left: '50%',
    transform: [{ translateX: '-50%' }],
    width: 0.6 * EMOJI_SIZE,
  },
});

function YayEmoji() {
  return (
    <Animated.View style={yayStyles.emoji}>
      <View style={yayStyles.eyeBrows}>
        <View style={yayStyles.eyeBrow} />
        <View style={yayStyles.eyeBrow} />
      </View>
      <Svg
        height={0.5 * EMOJI_SIZE}
        style={yayStyles.cheeks}
        width={EMOJI_SIZE}>
        <Defs>
          <RadialGradient cx="50%" cy="50%" id="grad" rx="50%" ry="50%">
            <Stop offset="0" stopColor={COLORS.red} stopOpacity="0.3" />
            <Stop offset="0.3" stopColor={COLORS.red} stopOpacity="0.3" />
            <Stop offset="0.85" stopColor={COLORS.red} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect
          fill="url(#grad)"
          height={0.5 * EMOJI_SIZE}
          width={0.5 * EMOJI_SIZE}
          x="0"
          y="0"
        />
        <Rect
          fill="url(#grad)"
          height={0.5 * EMOJI_SIZE}
          width={0.5 * EMOJI_SIZE}
          x="50%"
          y="0"
        />
      </Svg>
      <View style={yayStyles.mouth} />
    </Animated.View>
  );
}

const yay = css.keyframes({
  '25%': {
    transform: [{ rotate: '-15deg' }],
  },
  '75%': {
    transform: [{ rotate: '15deg' }],
  },
});

const yayStyles = css.create({
  cheeks: {
    position: 'absolute',
  },
  emoji: {
    ...sharedStyles.emoji,
    animationDirection: 'alternate',
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationName: yay,
    animationTimingFunction: 'linear',
    backgroundColor: COLORS.base,
    overflow: 'hidden',
  },
  eyeBrow: {
    borderBottomWidth: 0,
    borderColor: COLORS.black,
    borderTopLeftRadius: radius.full,
    borderTopRightRadius: radius.full,
    borderWidth: 0.05 * EMOJI_SIZE,
    height: 0.15 * EMOJI_SIZE,
    transform: [{ scaleY: 1.1 }],
    width: 0.3 * EMOJI_SIZE,
  },
  eyeBrows: {
    flexDirection: 'row',
    gap: 0.05 * EMOJI_SIZE,
    top: -0.1 * EMOJI_SIZE,
  },
  mouth: {
    borderBottomLeftRadius: 0.3 * EMOJI_SIZE,
    borderBottomRightRadius: 0.3 * EMOJI_SIZE,
    borderColor: COLORS.black,
    borderTopWidth: 0,
    borderWidth: 0.06 * EMOJI_SIZE,
    height: 0.25 * EMOJI_SIZE,
    top: -0.05 * EMOJI_SIZE,
    transform: [{ scaleY: 0.7 }],
    width: 0.5 * EMOJI_SIZE,
  },
});

function WowEmoji() {
  return (
    <View style={wowStyles.emoji}>
      <Animated.View style={wowStyles.face}>
        <Animated.View style={wowStyles.eyeBrows}>
          <View style={wowStyles.eyeBrow} />
          <View style={wowStyles.eyeBrow} />
        </Animated.View>

        <View style={wowStyles.eyes}>
          <View style={wowStyles.eye} />
          <View style={wowStyles.eye} />
        </View>

        <Animated.View style={wowStyles.mouth} />
      </Animated.View>
    </View>
  );
}

const wowFace = css.keyframes({
  '15%, 25%': {
    transform: [{ rotate: '20deg' }, { translateX: -0.25 * EMOJI_SIZE }],
  },
  '45%, 65%': {
    transform: [{ rotate: '-20deg' }, { translateX: 0.25 * EMOJI_SIZE }],
  },
  '75%, 100%': {
    transform: [{ rotate: '0deg' }, { translateX: 0 }],
  },
});

const wowBrows = css.keyframes({
  '0%, 75%, 100%': {
    top: -0.075 * EMOJI_SIZE,
  },
  '15%, 65%': {
    top: 0.025 * EMOJI_SIZE,
  },
});

const wowMouth = css.keyframes({
  '10%, 30%': {
    top: -0.1 * EMOJI_SIZE,
    transform: [{ scaleY: 1 }],
    width: 0.15 * EMOJI_SIZE,
  },
  '50%, 70%': {
    top: -0.075 * EMOJI_SIZE,
    transform: [{ scaleY: 1.25 }],
    width: 0.25 * EMOJI_SIZE,
  },
  '75%, 100%': {
    top: 0,
    transform: [{ scaleY: 1.5 }],
    width: 0.25 * EMOJI_SIZE,
  },
});

const wowStyles = css.create({
  emoji: {
    ...sharedStyles.emoji,
    backgroundColor: COLORS.base,
  },
  eye: {
    backgroundColor: COLORS.black,
    borderRadius: '50%',
    height: 0.12 * EMOJI_SIZE,
    transform: [{ scaleY: 1.5 }],
    width: 0.12 * EMOJI_SIZE,
  },
  eyeBrow: {
    borderBlockStartColor: COLORS.black,
    // (Android border colors support is pretty limited)
    borderColor: COLORS.baseTransparent,
    borderRadius: '50%',
    // use this trick with border colors to properly apply color only for
    // the top border and leave other borders "transparent" on Android
    borderWidth: 0.05 * EMOJI_SIZE,
    height: 0.3 * EMOJI_SIZE,
    width: 0.3 * EMOJI_SIZE,
  },
  eyeBrows: {
    animationDuration: '3s',
    animationIterationCount: 'infinite',
    animationName: wowBrows,
    animationTimingFunction: 'linear',
    flexDirection: 'row',
    gap: 0.075 * EMOJI_SIZE,
  },
  eyes: {
    flexDirection: 'row',
    gap: 0.25 * EMOJI_SIZE,
    top: -0.15 * EMOJI_SIZE,
  },
  face: {
    alignItems: 'center',
    animationDuration: '3s',
    animationIterationCount: 'infinite',
    animationName: wowFace,
    animationTimingFunction: 'linear',
  },
  mouth: {
    animationDuration: '3s',
    animationIterationCount: 'infinite',
    animationName: wowMouth,
    animationTimingFunction: 'linear',
    aspectRatio: 1,
    backgroundColor: COLORS.black,
    borderRadius: '50%',
    transform: [{ scaleY: 1.25 }],
    width: 0.25 * EMOJI_SIZE,
  },
});

function SadEmoji() {
  return (
    <View style={sadStyles.emoji}>
      <Animated.View style={sadStyles.face}>
        <View style={sadStyles.eyeBrows}>
          <View
            style={[sadStyles.eyeBrow, { transform: [{ rotate: '-30deg' }] }]}
          />
          <View
            style={[sadStyles.eyeBrow, { transform: [{ rotate: '30deg' }] }]}
          />
        </View>
        <View style={sadStyles.eyes}>
          <View style={sadStyles.eye} />
          <View style={sadStyles.eye} />
          <Animated.View style={sadStyles.tearWrapper}>
            <View style={sadStyles.tear} />
          </Animated.View>
        </View>
        <Animated.View style={sadStyles.mouth} />
      </Animated.View>
    </View>
  );
}

const sadFace = css.keyframes({
  '0%, 100%': {
    top: 0.15 * EMOJI_SIZE,
  },
  '25%, 35%': {
    top: 0,
  },
  '55%, 95%': {
    top: 0.25 * EMOJI_SIZE,
  },
});

const sadMouth = css.keyframes({
  '0%, 55%, 100%': {
    transform: [{ scaleY: 1.5 }, { scaleX: 1.15 }],
  },
  '25%, 35%': {
    transform: [{ scaleY: 1.15 }],
  },
});

const tearDrop = css.keyframes({
  '0%, 100%': {
    left: 0.45 * EMOJI_SIZE,
    top: 0,
    transform: [{ scale: 0 }],
  },
  '25%': {
    left: 0.45 * EMOJI_SIZE,
    transform: [{ scale: 1 }],
  },
  '49.9%': {
    left: 0.45 * EMOJI_SIZE,
    top: 0.5 * EMOJI_SIZE,
    transform: [{ scale: 0 }],
  },
  '50%': {
    left: -0.15 * EMOJI_SIZE,
    top: 0,
    transform: [{ scale: 0 }],
  },
  '75%': {
    left: -0.15 * EMOJI_SIZE,
    transform: [{ scale: 1 }],
  },
  '99.9%': {
    left: -0.15 * EMOJI_SIZE,
    top: 0.5 * EMOJI_SIZE,
    transform: [{ scale: 0 }],
  },
});

const sadStyles = css.create({
  emoji: {
    ...sharedStyles.emoji,
    backgroundColor: COLORS.base,
  },
  eye: {
    backgroundColor: COLORS.black,
    borderRadius: '50%',
    height: 0.12 * EMOJI_SIZE,
    width: 0.12 * EMOJI_SIZE,
  },
  eyeBrow: {
    borderBlockStartColor: COLORS.black,
    borderColor: COLORS.baseTransparent,
    borderRadius: '50%',
    borderWidth: 0.05 * EMOJI_SIZE,
    height: 0.3 * EMOJI_SIZE,
    width: 0.3 * EMOJI_SIZE,
  },
  eyeBrows: {
    flexDirection: 'row',
    gap: 0.125 * EMOJI_SIZE,
  },
  eyes: {
    flexDirection: 'row',
    gap: 0.3 * EMOJI_SIZE,
    top: -0.175 * EMOJI_SIZE,
  },
  face: {
    alignItems: 'center',
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationName: sadFace,
    animationTimingFunction: 'linear',
  },
  mouth: {
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationName: sadMouth,
    animationTimingFunction: 'linear',
    borderBlockStartColor: COLORS.black,
    borderColor: COLORS.baseTransparent,
    borderRadius: '50%',
    borderWidth: 0.04 * EMOJI_SIZE,
    height: 0.35 * EMOJI_SIZE,
    transform: [{ scaleY: 1.25 }],
    width: 0.35 * EMOJI_SIZE,
  },
  tear: {
    backgroundColor: COLORS.blue,
    borderRadius: '50%',
    borderTopLeftRadius: 0,
    height: 0.25 * EMOJI_SIZE,
    transform: [{ rotate: '45deg' }],
    width: 0.25 * EMOJI_SIZE,
  },
  tearWrapper: {
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationName: tearDrop,
    animationTimingFunction: 'linear',
    position: 'absolute',
  },
});

function AngryEmoji() {
  return (
    <View style={angryStyles.emoji}>
      <Svg
        height={EMOJI_SIZE}
        style={StyleSheet.absoluteFill}
        width={EMOJI_SIZE}>
        <Defs>
          <LinearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={COLORS.red} stopOpacity="1" />
            <Stop offset="0.9" stopColor={COLORS.red} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={0.5 * EMOJI_SIZE}
          cy={0.5 * EMOJI_SIZE}
          fill="url(#grad)"
          r={0.5 * EMOJI_SIZE}
        />
      </Svg>
      <Animated.View style={angryStyles.face}>
        <View style={angryStyles.eyeBrows}>
          <View
            style={[
              angryStyles.eyeBrow,
              {
                transform: [{ rotate: '17.5deg' }, { translateX: '15%' }],
              },
            ]}
          />
          <View
            style={[
              angryStyles.eyeBrow,
              { transform: [{ rotate: '-17.5deg' }, { translateX: '-15%' }] },
            ]}
          />
        </View>
        <View style={angryStyles.eyes}>
          <View style={angryStyles.eye} />
          <View style={angryStyles.eye} />
        </View>
        <Animated.View style={angryStyles.mouth} />
      </Animated.View>
    </View>
  );
}

const angryFace = css.keyframes({
  '35%, 60%': {
    transform: [
      { translateX: 0 },
      { translateY: 0.1 * EMOJI_SIZE },
      { scale: 0.9 },
    ],
  },
  '40%, 50%': {
    transform: [
      { translateX: -5 },
      { translateY: 0.1 * EMOJI_SIZE },
      { scale: 0.9 },
    ],
  },
  '45%, 55%': {
    transform: [
      { translateX: 5 },
      { translateY: 0.1 * EMOJI_SIZE },
      { scale: 0.9 },
    ],
  },
});

const angryMouth = css.keyframes({
  '25%, 50%': {
    transform: [{ scaleY: 0.2 }],
  },
});

const angryStyles = css.create({
  emoji: {
    ...sharedStyles.emoji,
    backgroundColor: COLORS.base,
  },
  eye: {
    backgroundColor: COLORS.black,
    borderRadius: '50%',
    height: 0.12 * EMOJI_SIZE,
    width: 0.12 * EMOJI_SIZE,
  },
  eyeBrow: {
    borderBlockEndColor: COLORS.black,
    borderColor: COLORS.baseTransparent,
    borderRadius: '50%',
    borderWidth: 0.04 * EMOJI_SIZE,
    height: 0.4 * EMOJI_SIZE,
    top: 0.095 * EMOJI_SIZE,
    width: 0.45 * EMOJI_SIZE,
  },
  eyeBrows: {
    flexDirection: 'row',
    gap: 0.01 * EMOJI_SIZE,
  },
  eyes: {
    flexDirection: 'row',
    gap: 0.3 * EMOJI_SIZE,
    top: 0.075 * EMOJI_SIZE,
  },
  face: {
    alignItems: 'center',
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationName: angryFace,
    animationTimingFunction: 'linear',
  },
  mouth: {
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationName: angryMouth,
    animationTimingFunction: 'linear',
    backgroundColor: COLORS.black,
    borderRadius: '50%',
    height: 0.3 * EMOJI_SIZE,
    transform: [{ scaleY: 0.5 }],
    width: 0.3 * EMOJI_SIZE,
  },
});
