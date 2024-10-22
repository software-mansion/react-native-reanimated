/**
 * The original CSS implementation of this example can be found here:
 * https://codepen.io/JustGoscha/pen/reVLrp
 */

import { Dimensions, StyleSheet, View } from 'react-native';
import { colors } from '../../../../theme';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

const EXAMPLE_SCALE = 0.85;

const CONTAINER_SIZE = 320;
const BOX_SIZE = 40;

const WINDOW_DIMENSIONS = Dimensions.get('window');

export default function SquishySquashy() {
  const move: CSSAnimationKeyframes = {
    // --------- Swoosh to the RIGHT -----------
    '0%': {
      transform: 'translate(0,0) scale(1,1)',
    },
    '1%': {
      transform: 'translate(0,0) scale(1,1)',
    },
    '4%': {
      transform: 'translate(140px,0) scale(8,1)',
    },
    '5%': {
      transform: 'translate(280px,0) scale(1,1)',
    },
    '6%': {
      transform: 'translate(290px,0) scale(0.5,2)',
    },
    '8%': {
      transform: 'translate(275px,0) scale(1.25,0.9)',
    },
    '10%': {
      transform: 'translate(280px,0) scale(1,1)',
    },

    // ------- Beam DOWN --------
    '19%': {
      transform: 'translate(280px,140px) scale(0.4,8)',
    },
    '21%': {
      transform: 'translate(280px,140px) scale(0.4,8)',
    },
    '22%': {
      transform: 'translate(280px,280px) scale(1,1)',
    },

    // --------- STEPS to the LEFT -----------
    '24%': {
      transform: 'translate(280px,280px)',
    },
    '25%': {
      transform: 'translate(260px,272px) scale(1,1) rotate(-45deg)',
    },
    '27%': {
      transform: 'translate(240px,280px) scale(1,1) rotate(-90deg)',
    },
    '27.1%': {
      transform: 'translate(240px,286px) scale(1.3,0.7) rotate(-90deg)',
    },
    '29%': {
      transform: 'translate(240px,280px) scale(1,1) rotate(-90deg)',
    },

    '33%': {
      transform: 'translate(220px,272px) scale(1,1) rotate(-135deg)',
    },
    '35%': {
      transform: 'translate(200px,280px) scale(1,1) rotate(-180deg)',
    },
    '35.1%': {
      transform: 'translate(200px,286px) scale(1.3,0.7) rotate(-180deg)',
    },
    '38%': {
      transform: 'translate(200px,280px) scale(1,1) rotate(-180deg)',
    },

    '42%': {
      transform: 'translate(180px,272px) scale(1,1) rotate(-225deg)',
    },
    '44%': {
      transform: 'translate(160px,280px) scale(1,1) rotate(-270deg)',
    },
    '44.1%': {
      transform: 'translate(160px,286px) scale(1.3,0.7) rotate(-270deg)',
    },
    '46%': {
      transform: 'translate(160px,280px) scale(1,1) rotate(-270deg)',
    },

    '49%': {
      transform: 'translate(140px,272px) scale(1,1) rotate(-315deg)',
    },
    '51%': {
      transform: 'translate(120px,280px) scale(1,1) rotate(-360deg)',
    },
    '51.1%': {
      transform: 'translate(120px,286px) scale(1.3,0.7) rotate(-360deg)',
    },
    '53%': {
      transform: 'translate(120px,280px) scale(1,1) rotate(-360deg)',
    },

    '56%': {
      transform: 'translate(100px,272px) scale(1,1) rotate(-405deg)',
    },
    '58%': {
      transform: 'translate(80px,280px) scale(1,1) rotate(-450deg)',
    },
    '58.1%': {
      transform: 'translate(80px,286px) scale(1.3,0.7) rotate(-450deg)',
    },
    '60%': {
      transform: 'translate(80px,280px) scale(1,1) rotate(-450deg)',
    },

    '63%': {
      transform: 'translate(60px,272px) scale(1,1) rotate(-495deg)',
    },
    '65%': {
      transform: 'translate(40px,280px) scale(1,1) rotate(-540deg)',
    },
    '65.1%': {
      transform: 'translate(40px,286px) scale(1.3,0.7) rotate(-540deg)',
    },
    '67%': {
      transform: 'translate(40px,280px) scale(1,1) rotate(-540deg)',
    },

    '70%': {
      transform: 'translate(20px,272px) scale(1,1) rotate(-585deg)',
    },
    '73%': {
      transform: 'translate(0,280px) scale(1,1) rotate(-630deg)',
    },
    '73.0001%': {
      transform: 'translate(0,280px) rotate(0deg)',
    },

    // -------- RACE to the TOP ---------
    '75%': {
      transform: 'translate(0,280px) scale(1,1) skew(0,0)',
    },
    '80%': {
      transform: 'translate(0,270px) scale(1,1) skew(0,1deg)',
    },
    '85%': {
      transform: 'translate(0,0) scale(1,1) skew(0,30deg)',
    },
    '85.1%': {
      transform: 'translate(0,0) scale(1,1) skew(0,0)',
    },
    '86%': {
      transform: 'translate(0,-16px) scale(1.9,0.3) skew(0,0)',
    },
    '90%': {
      transform: 'translate(0,2px) scale(0.9,1.1) skew(0,0)',
    },
    '95%': {
      transform: 'translate(0,0) scale(1,1)',
    },
  };

  const scale =
    (EXAMPLE_SCALE *
      Math.min(WINDOW_DIMENSIONS.width, WINDOW_DIMENSIONS.height)) /
    CONTAINER_SIZE;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { transform: [{ scale }] }]}>
        <Animated.View
          style={[
            styles.box,
            {
              animationName: move,
              animationDuration: '6s',
              animationIterationCount: 'infinite',
              animationTimingFunction: 'linear',
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    backgroundColor: colors.background2,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: colors.primary,
  },
});
