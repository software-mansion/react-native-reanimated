/**
 * The original CSS implementation of this example can be found here:
 * https://codepen.io/AshBardhan/pen/dNKwXz?editors=1100
 */

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { colors, radius, spacing } from '../../../../theme';
import { Dimensions, StyleSheet, View } from 'react-native';
import { faHeart, faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { Grid, ScrollScreen, Stagger, Text } from '../../../../components';
import {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
  Svg,
} from 'react-native-svg';
import type { ComponentType } from 'react';

const WINDOW_WIDTH = Dimensions.get('window').width;
const EMOJI_SIZE = 0.2 * WINDOW_WIDTH;

const COLORS = {
  white: '#ffffff',
  black: '#000000',
  blue: '#548dff',
  red: '#f55064',
  base: '#f7d154',
};

export default function Emojis() {
  return (
    <ScrollScreen contentContainerStyle={{ paddingVertical: spacing.lg }}>
      <Grid
        columns={3}
        staggerInterval={100}
        columnGap={spacing.sm}
        rowGap={spacing.md}>
        <Example title="Like" Emoji={LikeEmoji} />
        <Example title="Heart" Emoji={HeartEmoji} />
        <Example title="HaHa" Emoji={HaHaEmoji} />
        <Example title="Yay" Emoji={YayEmoji} />
        <Example title="Wow" Emoji={WowEmoji} />
        <Example title="Sad" Emoji={SadEmoji} />
        <Example title="Angry" Emoji={AngryEmoji} />
      </Grid>
    </ScrollScreen>
  );
}

type ExampleProps = {
  title: string;
  Emoji: ComponentType;
};

function Example({ title, Emoji }: ExampleProps) {
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
    backgroundColor: colors.background1,
    borderRadius: radius.md,
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
    width: '100%',
  },
  emoji: {
    width: EMOJI_SIZE,
    height: EMOJI_SIZE,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

function LikeEmoji() {
  const like: CSSAnimationKeyframes = {
    '25%': {
      transform: [{ rotate: '15deg' }, { translateY: 0 }],
    },
    '50%': {
      transform: [{ rotate: '-15deg' }, { translateY: -10 }],
    },
    '75%': {
      transform: [{ rotate: '0deg' }, { translateY: 0 }],
    },
    '100%': {
      transform: [{ rotate: '0deg' }],
    },
  };

  return (
    <View style={likeStyles.emoji}>
      <Animated.View
        style={[
          likeStyles.icon,
          {
            animationName: like,
            animationDuration: '2s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          },
        ]}>
        <FontAwesomeIcon
          icon={faThumbsUp}
          size={0.6 * EMOJI_SIZE}
          color={COLORS.white}
        />
      </Animated.View>
    </View>
  );
}

const likeStyles = StyleSheet.create({
  emoji: {
    ...sharedStyles.emoji,
    backgroundColor: COLORS.blue,
  },
  icon: {
    transformOrigin: '0% 50%',
  },
});

function HeartEmoji() {
  const heart: CSSAnimationKeyframes = {
    '25%': {
      transform: [{ scale: 1.1 }],
    },
    '75%': {
      transform: [{ scale: 0.6 }],
    },
  };

  return (
    <View style={heartStyles.emoji}>
      <Animated.View
        style={{
          animationName: heart,
          animationDuration: '1s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
        }}>
        <FontAwesomeIcon
          icon={faHeart}
          size={0.6 * EMOJI_SIZE}
          color={COLORS.white}
        />
      </Animated.View>
    </View>
  );
}

const heartStyles = StyleSheet.create({
  emoji: {
    ...sharedStyles.emoji,
    backgroundColor: COLORS.red,
  },
});

function HaHaEmoji() {
  const hahaFace: CSSAnimationKeyframes = {
    '10%': {
      transform: [{ translateY: '25%' }],
    },
    '20%': {
      transform: [{ translateY: '15%' }],
    },
    '30%': {
      transform: [{ translateY: '25%' }],
    },
    '40%': {
      transform: [{ translateY: '15%' }],
    },
    '50%': {
      transform: [{ translateY: '25%' }],
    },
    '60%': {
      transform: [{ translateY: 0 }],
    },
    '70%': {
      transform: [{ translateY: '-10%' }],
    },
    '80%': {
      transform: [{ translateY: 0 }],
    },
    '90%': {
      transform: [{ translateY: '-10%' }],
    },
  };

  const hahaMouth: CSSAnimationKeyframes = {
    '10%': {
      transform: [{ scale: 0.6 }],
    },
    '20%': {
      transform: [{ scale: 0.8 }],
    },
    '30%': {
      transform: [{ scale: 0.6 }],
    },
    '40%': {
      transform: [{ scale: 0.8 }],
    },
    '50%': {
      transform: [{ scale: 0.6 }],
    },
    '60%': {
      transform: [{ scale: 1 }],
    },
    '70%': {
      transform: [{ scale: 1.2 }],
    },
    '80%': {
      transform: [{ scale: 1 }],
    },
    '90%': {
      transform: [{ scale: 1.1 }],
    },
  };

  return (
    <View style={hahaStyles.emoji}>
      <Animated.View
        style={[
          hahaStyles.face,
          {
            animationName: hahaFace,
            animationDuration: '2s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          },
        ]}>
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

        <Animated.View
          style={[
            hahaStyles.mouth,
            {
              animationName: hahaMouth,
              animationDuration: '2s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            },
          ]}>
          <View style={hahaStyles.tongue} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const hahaStyles = StyleSheet.create({
  emoji: {
    ...sharedStyles.emoji,
    backgroundColor: COLORS.base,
  },
  face: {
    alignItems: 'center',
    gap: 0.15 * EMOJI_SIZE,
  },
  eyes: {
    flexDirection: 'row',
    gap: 0.2 * EMOJI_SIZE,
  },
  eye: {
    width: 0.225 * EMOJI_SIZE,
    height: 0.055 * EMOJI_SIZE,
    borderRadius: radius.full,
    backgroundColor: COLORS.black,
  },
  mouth: {
    width: 0.6 * EMOJI_SIZE,
    height: 0.3 * EMOJI_SIZE,
    borderBottomLeftRadius: radius.full,
    borderBottomRightRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: COLORS.black,
  },
  tongue: {
    width: 0.6 * EMOJI_SIZE,
    height: 0.5 * EMOJI_SIZE,
    bottom: '-50%',
    left: '50%',
    transform: [{ translateX: '-50%' }],
    borderRadius: '50%',
    backgroundColor: COLORS.red,
  },
});

function YayEmoji() {
  const yay: CSSAnimationKeyframes = {
    '25%': {
      transform: [{ rotate: '-15deg' }],
    },
    '75%': {
      transform: [{ rotate: '15deg' }],
    },
  };

  return (
    <Animated.View
      style={[
        yayStyles.emoji,
        {
          animationName: yay,
          animationDuration: '1s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
        },
      ]}>
      <View style={yayStyles.eyeBrows}>
        <View style={yayStyles.eyeBrow} />
        <View style={yayStyles.eyeBrow} />
      </View>
      <Svg
        width={EMOJI_SIZE}
        height={0.5 * EMOJI_SIZE}
        style={yayStyles.cheeks}>
        <Defs>
          <RadialGradient id="grad" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={COLORS.red} stopOpacity="0.3" />
            <Stop offset="0.3" stopColor={COLORS.red} stopOpacity="0.3" />
            <Stop offset="0.85" stopColor={COLORS.red} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={0.5 * EMOJI_SIZE}
          height={0.5 * EMOJI_SIZE}
          fill="url(#grad)"
        />
        <Rect
          x="50%"
          y="0"
          width={0.5 * EMOJI_SIZE}
          height={0.5 * EMOJI_SIZE}
          fill="url(#grad)"
        />
      </Svg>
      <View style={yayStyles.mouth} />
    </Animated.View>
  );
}

const yayStyles = StyleSheet.create({
  emoji: {
    ...sharedStyles.emoji,
    backgroundColor: COLORS.base,
    overflow: 'hidden',
  },
  eyeBrows: {
    flexDirection: 'row',
    top: -0.1 * EMOJI_SIZE,
    gap: 0.05 * EMOJI_SIZE,
  },
  cheeks: {
    position: 'absolute',
  },
  eyeBrow: {
    borderTopLeftRadius: radius.full,
    borderTopRightRadius: radius.full,
    height: 0.15 * EMOJI_SIZE,
    width: 0.3 * EMOJI_SIZE,
    borderWidth: 0.05 * EMOJI_SIZE,
    borderColor: COLORS.black,
    borderBottomWidth: 0,
    transform: [{ scaleY: 1.1 }],
  },
  mouth: {
    top: -0.05 * EMOJI_SIZE,
    width: 0.5 * EMOJI_SIZE,
    height: 0.25 * EMOJI_SIZE,
    borderBottomLeftRadius: 0.3 * EMOJI_SIZE,
    borderBottomRightRadius: 0.3 * EMOJI_SIZE,
    borderWidth: 0.06 * EMOJI_SIZE,
    borderColor: COLORS.black,
    borderTopWidth: 0,
    transform: [{ scaleY: 0.7 }],
  },
});

function WowEmoji() {
  // TODO - add keyframe merging - too many repeated values
  const wowFace: CSSAnimationKeyframes = {
    '15%': {
      transform: [{ rotate: '20deg' }, { translateX: -0.25 * EMOJI_SIZE }],
    },
    '25%': {
      transform: [{ rotate: '20deg' }, { translateX: -0.25 * EMOJI_SIZE }],
    },
    '45%': {
      transform: [{ rotate: '-20deg' }, { translateX: 0.25 * EMOJI_SIZE }],
    },
    '65%': {
      transform: [{ rotate: '-20deg' }, { translateX: 0.25 * EMOJI_SIZE }],
    },
    '75%': {
      transform: [{ rotate: '0deg' }, { translateX: 0 }],
    },
    '100%': {
      transform: [{ rotate: '0deg' }, { translateX: 0 }],
    },
  };

  const wowBrows: CSSAnimationKeyframes = {
    '15%': {
      top: 0.025 * EMOJI_SIZE,
    },
    '65%': {
      top: 0.025 * EMOJI_SIZE,
    },
    '75%': {
      top: -0.075 * EMOJI_SIZE,
    },
    '100%': {
      top: -0.075 * EMOJI_SIZE,
    },
    '0%': {
      top: -0.075 * EMOJI_SIZE,
    },
  };

  const wowMouth: CSSAnimationKeyframes = {
    '10%': {
      width: 0.15 * EMOJI_SIZE,
      top: -0.1 * EMOJI_SIZE,
      transform: [{ scaleY: 1 }],
    },
    '30%': {
      width: 0.15 * EMOJI_SIZE,
      top: -0.1 * EMOJI_SIZE,
      transform: [{ scaleY: 1 }],
    },
    '50%': {
      width: 0.25 * EMOJI_SIZE,
      top: -0.075 * EMOJI_SIZE,
      transform: [{ scaleY: 1.25 }],
    },
    '70%': {
      width: 0.25 * EMOJI_SIZE,
      top: -0.075 * EMOJI_SIZE,
      transform: [{ scaleY: 1.25 }],
    },
    '75%': {
      width: 0.25 * EMOJI_SIZE,
      top: 0,
      transform: [{ scaleY: 1.5 }],
    },
    '100%': {
      width: 0.25 * EMOJI_SIZE,
      top: 0,
      transform: [{ scaleY: 1.5 }],
    },
  };

  return (
    <View style={wowStyles.emoji}>
      <Animated.View
        style={[
          wowStyles.face,
          {
            animationName: wowFace,
            animationDuration: '3s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          },
        ]}>
        <Animated.View
          style={[
            wowStyles.eyeBrows,
            {
              animationName: wowBrows,
              animationDuration: '3s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            },
          ]}>
          <View style={wowStyles.eyeBrow} />
          <View style={wowStyles.eyeBrow} />
        </Animated.View>

        <View style={wowStyles.eyes}>
          <View style={wowStyles.eye} />
          <View style={wowStyles.eye} />
        </View>

        <Animated.View
          style={[
            wowStyles.mouth,
            {
              animationName: wowMouth,
              animationDuration: '3s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const wowStyles = StyleSheet.create({
  emoji: {
    ...sharedStyles.emoji,
    backgroundColor: COLORS.base,
  },
  face: {
    alignItems: 'center',
  },
  eyeBrows: {
    flexDirection: 'row',
    gap: 0.075 * EMOJI_SIZE,
  },
  eyeBrow: {
    width: 0.3 * EMOJI_SIZE,
    height: 0.3 * EMOJI_SIZE,
    borderWidth: 0.05 * EMOJI_SIZE,
    borderTopColor: COLORS.black,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRadius: '50%',
  },
  eyes: {
    flexDirection: 'row',
    gap: 0.25 * EMOJI_SIZE,
    top: -0.15 * EMOJI_SIZE,
  },
  eye: {
    width: 0.12 * EMOJI_SIZE,
    height: 0.12 * EMOJI_SIZE,
    borderRadius: '50%',
    transform: [{ scaleY: 1.5 }],
    backgroundColor: COLORS.black,
  },
  mouth: {
    aspectRatio: 1,
    width: 0.25 * EMOJI_SIZE,
    transform: [{ scaleY: 1.25 }],
    borderRadius: '50%',
    backgroundColor: COLORS.black,
  },
});

function SadEmoji() {
  const sadFace: CSSAnimationKeyframes = {
    '0%': {
      top: 0.15 * EMOJI_SIZE,
    },
    '25%': {
      top: 0,
    },
    '35%': {
      top: 0,
    },
    '55%': {
      top: 0.25 * EMOJI_SIZE,
    },
    '95%': {
      top: 0.25 * EMOJI_SIZE,
    },
    '100%': {
      top: 0.15 * EMOJI_SIZE,
    },
  };

  const sadMouth: CSSAnimationKeyframes = {
    '0%': {
      transform: [{ scaleY: 1.5 }, { scaleX: 1.15 }],
    },
    '25%': {
      transform: [{ scaleY: 1.15 }],
    },
    '35%': {
      transform: [{ scaleY: 1.15 }],
    },
    '55%': {
      transform: [{ scaleY: 1.5 }, { scaleX: 1.15 }],
    },
    '100%': {
      transform: [{ scaleY: 1.5 }, { scaleX: 1.15 }],
    },
  };

  const tearDrop: CSSAnimationKeyframes = {
    '0%': {
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
    '100%': {
      left: 0.45 * EMOJI_SIZE,
      top: 0,
      transform: [{ scale: 0 }],
    },
  };

  return (
    <View style={sadStyles.emoji}>
      <Animated.View
        style={[
          sadStyles.face,
          {
            animationName: sadFace,
            animationDuration: '2s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          },
        ]}>
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
          <Animated.View
            style={[
              sadStyles.tearWrapper,
              {
                animationName: tearDrop,
                animationDuration: '2s',
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
              },
            ]}>
            <View style={sadStyles.tear} />
          </Animated.View>
        </View>
        <Animated.View
          style={[
            sadStyles.mouth,
            {
              animationName: sadMouth,
              animationDuration: '2s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const sadStyles = StyleSheet.create({
  emoji: {
    ...sharedStyles.emoji,
    backgroundColor: COLORS.base,
  },
  face: {
    alignItems: 'center',
  },
  eyeBrows: {
    flexDirection: 'row',
    gap: 0.125 * EMOJI_SIZE,
  },
  eyeBrow: {
    width: 0.3 * EMOJI_SIZE,
    height: 0.3 * EMOJI_SIZE,
    borderWidth: 0.05 * EMOJI_SIZE,
    borderTopColor: COLORS.black,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRadius: '50%',
  },
  eyes: {
    flexDirection: 'row',
    gap: 0.3 * EMOJI_SIZE,
    top: -0.175 * EMOJI_SIZE,
  },
  eye: {
    width: 0.12 * EMOJI_SIZE,
    height: 0.12 * EMOJI_SIZE,
    borderRadius: '50%',
    backgroundColor: COLORS.black,
  },
  mouth: {
    width: 0.35 * EMOJI_SIZE,
    height: 0.35 * EMOJI_SIZE,
    transform: [{ scaleY: 1.25 }],
    borderRadius: '50%',
    borderWidth: 0.04 * EMOJI_SIZE,
    borderTopColor: COLORS.black,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tearWrapper: {
    position: 'absolute',
  },
  tear: {
    width: 0.25 * EMOJI_SIZE,
    height: 0.25 * EMOJI_SIZE,
    transform: [{ rotate: '45deg' }],
    borderRadius: '50%',
    borderTopLeftRadius: 0,
    backgroundColor: COLORS.blue,
  },
});

function AngryEmoji() {
  const angryFace: CSSAnimationKeyframes = {
    '35%': {
      transform: [
        { translateX: 0 },
        { translateY: 0.1 * EMOJI_SIZE },
        { scale: 0.9 },
      ],
    },
    '60%': {
      transform: [
        { translateX: 0 },
        { translateY: 0.1 * EMOJI_SIZE },
        { scale: 0.9 },
      ],
    },
    '40%': {
      transform: [
        { translateX: -5 },
        { translateY: 0.1 * EMOJI_SIZE },
        { scale: 0.9 },
      ],
    },
    '45%': {
      transform: [
        { translateX: 5 },
        { translateY: 0.1 * EMOJI_SIZE },
        { scale: 0.9 },
      ],
    },
    '50%': {
      transform: [
        { translateX: -5 },
        { translateY: 0.1 * EMOJI_SIZE },
        { scale: 0.9 },
      ],
    },
    '55%': {
      transform: [
        { translateX: 5 },
        { translateY: 0.1 * EMOJI_SIZE },
        { scale: 0.9 },
      ],
    },
  };

  const angryMouth: CSSAnimationKeyframes = {
    '25%': {
      transform: [{ scaleY: 0.2 }],
    },
    '50%': {
      transform: [{ scaleY: 0.2 }],
    },
  };

  return (
    <View style={angryStyles.emoji}>
      <Svg
        width={EMOJI_SIZE}
        height={EMOJI_SIZE}
        style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLORS.red} stopOpacity="1" />
            <Stop offset="0.9" stopColor={COLORS.red} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={0.5 * EMOJI_SIZE}
          cy={0.5 * EMOJI_SIZE}
          r={0.5 * EMOJI_SIZE}
          fill="url(#grad)"
        />
      </Svg>
      <Animated.View
        style={[
          angryStyles.face,
          {
            animationName: angryFace,
            animationDuration: '2s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          },
        ]}>
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
        <Animated.View
          style={[
            angryStyles.mouth,
            {
              animationName: angryMouth,
              animationDuration: '2s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const angryStyles = StyleSheet.create({
  emoji: {
    ...sharedStyles.emoji,
    backgroundColor: COLORS.base,
  },
  face: {
    alignItems: 'center',
  },
  eyeBrows: {
    flexDirection: 'row',
    gap: 0.01 * EMOJI_SIZE,
  },
  eyeBrow: {
    width: 0.45 * EMOJI_SIZE,
    height: 0.4 * EMOJI_SIZE,
    borderWidth: 0.04 * EMOJI_SIZE,
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.black,
    borderRadius: '50%',
    top: 0.095 * EMOJI_SIZE,
  },
  eyes: {
    flexDirection: 'row',
    gap: 0.3 * EMOJI_SIZE,
    top: 0.075 * EMOJI_SIZE,
  },
  eye: {
    width: 0.12 * EMOJI_SIZE,
    height: 0.12 * EMOJI_SIZE,
    borderRadius: '50%',
    backgroundColor: COLORS.black,
  },
  mouth: {
    width: 0.3 * EMOJI_SIZE,
    height: 0.3 * EMOJI_SIZE,
    borderRadius: '50%',
    backgroundColor: COLORS.black,
    transform: [{ scaleY: 0.5 }],
  },
});
