/**
 * The original CSS implementation of this example can be found here:
 * https://codepen.io/z-/pen/JXVpgp
 */

import { View } from 'react-native';
import Animated, { css } from 'react-native-reanimated';

import { Screen } from '@/apps/css/components';
import { radius } from '@/theme';

const ANIMATION_DURATION = 1500;
const FLAMES_COUNT = 4;

const COLORS = {
  black: '#111217',
  brownDark: '#612E25',
  brownLight: '#70392F',
  orange: '#FDAC01',
  red: '#F73B01',
  yellow: '#FFDC01',
};

export default function Campfire() {
  return (
    <Screen style={styles.container}>
      <View style={styles.campfire}>
        <View style={styles.flames}>
          {Array.from({ length: FLAMES_COUNT }).map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.flame,
                {
                  animationDelay: (ANIMATION_DURATION / 4) * index,
                  animationName: index % 2 === 0 ? flameEven : flameOdd,
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
    </Screen>
  );
}

const flameEven = css.keyframes({
  '0%': {
    backgroundColor: COLORS.yellow,
    bottom: '0%',
    height: '0%',
    right: '0%',
    width: '0%',
    zIndex: 1000000,
  },
  '25%': {
    bottom: '1%',
    height: '100%',
    right: '2%',
    width: '100%',
  },
  '40%': {
    backgroundColor: COLORS.orange,
    zIndex: 1000000,
  },
  // eslint-disable-next-line perfectionist/sort-objects
  '100%': {
    backgroundColor: COLORS.red,
    bottom: '150%',
    height: '0%',
    right: '170%',
    width: '0%',
    zIndex: -10,
  },
});

const flameOdd = css.keyframes({
  '0%': {
    backgroundColor: COLORS.yellow,
    bottom: '0%',
    height: '0%',
    right: '0%',
    width: '0%',
    zIndex: 1000000,
  },
  '25%': {
    bottom: '2%',
    height: '100%',
    right: '1%',
    width: '100%',
  },
  '40%': {
    backgroundColor: COLORS.orange,
    zIndex: 1000000,
  },
  // eslint-disable-next-line perfectionist/sort-objects
  '100%': {
    backgroundColor: COLORS.red,
    bottom: '170%',
    height: '0%',
    right: '150%',
    width: '0%',
    zIndex: -10,
  },
});

const styles = css.create({
  campfire: {
    alignItems: 'center',
    maxWidth: 300,
    width: '40%',
  },
  container: {
    alignItems: 'center',
    backgroundColor: COLORS.black,
    flex: 1,
    justifyContent: 'center',
  },
  flame: {
    animationDuration: ANIMATION_DURATION,
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in',
    backgroundColor: COLORS.yellow,
    borderRadius: radius.md,
    position: 'absolute',
  },
  flames: {
    aspectRatio: 1,
    transform: [{ rotate: '45deg' }],
    width: '60%',
  },
  log: {
    borderRadius: radius.sm,
    height: '100%',
    left: '50%',
    position: 'absolute',
    width: '100%',
  },
  logDark: {
    backgroundColor: COLORS.brownDark,
    transform: [{ translateX: '-50%' }, { rotate: '-20deg' }],
  },
  logLight: {
    backgroundColor: COLORS.brownLight,
    transform: [{ translateX: '-50%' }, { rotate: '20deg' }],
  },
  logs: {
    aspectRatio: 6,
    width: '100%',
  },
});
