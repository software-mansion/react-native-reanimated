/**
 * The original CSS implementation of this example can be found here:
 * https://codepen.io/z-/pen/JXVpgp
 */

import { StyleSheet, View } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { radius } from '../../../../theme';

const ANIMATION_DURATION = 1500;
const FLAMES_COUNT = 4;

const COLORS = {
  black: '#111217',
  brownLight: '#70392F',
  brownDark: '#612E25',
  yellow: '#FFDC01',
  orange: '#FDAC01',
  red: '#F73B01',
};

export default function Campfire() {
  const flameOdd: CSSAnimationKeyframes = {
    '0%': {
      width: '0%',
      height: '0%',
      right: '0%',
      bottom: '0%',
      backgroundColor: COLORS.yellow,
      zIndex: 1000000,
    },
    '25%': {
      width: '100%',
      height: '100%',
      right: '1%',
      bottom: '2%',
    },
    '40%': {
      backgroundColor: COLORS.orange,
      zIndex: 1000000,
    },
    '100%': {
      backgroundColor: COLORS.red,
      zIndex: -10,
      right: '150%',
      bottom: '170%',
      width: '0%',
      height: '0%',
    },
  };

  const flameEven: CSSAnimationKeyframes = {
    '0%': {
      width: '0%',
      height: '0%',
      right: '0%',
      bottom: '0%',
      backgroundColor: COLORS.yellow,
      zIndex: 1000000,
    },
    '25%': {
      width: '100%',
      height: '100%',
      right: '2%',
      bottom: '1%',
    },
    '40%': {
      backgroundColor: COLORS.orange,
      zIndex: 1000000,
    },
    '100%': {
      backgroundColor: COLORS.red,
      zIndex: -10,
      right: '170%',
      bottom: '150%',
      width: '0%',
      height: '0%',
    },
  };

  return (
    <View style={styles.container}>
      <View style={styles.campfire}>
        <View style={styles.flames}>
          {Array.from({ length: FLAMES_COUNT }).map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.flame,
                {
                  animationName: index % 2 === 0 ? flameEven : flameOdd,
                  animationDuration: ANIMATION_DURATION,
                  animationDelay: (ANIMATION_DURATION / 4) * index,
                  animationIterationCount: 'infinite',
                  animationTimingFunction: 'easeIn',
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.logs}>
          <View style={[styles.log, styles.logDark]} />
          <View style={[styles.log, styles.logLight]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.black,
  },
  campfire: {
    width: '40%',
    alignItems: 'center',
  },
  flames: {
    width: '60%',
    aspectRatio: 1,
    transform: [{ rotate: '45deg' }],
  },
  flame: {
    position: 'absolute',
    backgroundColor: COLORS.yellow,
    borderRadius: radius.md,
  },
  logs: {
    width: '100%',
    aspectRatio: 6,
  },
  log: {
    position: 'absolute',
    left: '50%',
    height: '100%',
    width: '100%',
    borderRadius: radius.sm,
  },
  logDark: {
    transform: [{ translateX: '-50%' }, { rotate: '-20deg' }],
    backgroundColor: COLORS.brownDark,
  },
  logLight: {
    transform: [{ translateX: '-50%' }, { rotate: '20deg' }],
    backgroundColor: COLORS.brownLight,
  },
});
