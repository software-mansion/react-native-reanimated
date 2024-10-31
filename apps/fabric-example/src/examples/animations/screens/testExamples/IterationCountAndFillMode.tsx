// TODO - make sure that forwards fill mode works fine for fractional iteration counts

import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, flex } from '@/theme';

const animationDuration = '2s';

const parentAnimation: CSSAnimationConfig = {
  animationDuration,
  animationIterationCount: 'infinite',
  animationName: {
    to: {
      width: 300,
    },
  },
};

const childAnimation: CSSAnimationConfig = {
  animationDuration,
  animationFillMode: 'forwards',
  animationIterationCount: 1.5,
  animationName: {
    to: {
      width: 150,
    },
  },
};

const innerChildAnimation: CSSAnimationConfig = {
  animationDuration,
  animationName: {
    from: {
      opacity: 0,
    },
  },
};

export default function IterationCountAndFillMode() {
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.parent, parentAnimation]}>
        <Animated.View style={[styles.child, childAnimation]}>
          <Animated.View style={[styles.innerChild, innerChildAnimation]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  child: {
    ...flex.center,
    backgroundColor: colors.primaryDark,
    height: 75,
    width: '100%',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  innerChild: {
    backgroundColor: colors.primaryLight,
    height: 30,
    width: 75,
  },
  parent: {
    ...flex.center,
    backgroundColor: colors.primary,
    height: 75,
    width: 0,
  },
});
