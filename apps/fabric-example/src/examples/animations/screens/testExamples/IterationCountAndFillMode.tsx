// TODO - make sure that forwards fill mode works fine for fractional iteration counts

import { StyleSheet, View } from 'react-native';
import { colors, flex } from '../../../../theme';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

const animationDuration = '2s';

const parentAnimation: CSSAnimationConfig = {
  animationName: {
    to: {
      width: 300,
    },
  },
  animationDuration,
  animationIterationCount: 'infinite',
};

const childAnimation: CSSAnimationConfig = {
  animationName: {
    to: {
      width: 150,
    },
  },
  animationDuration,
  animationIterationCount: 1.5,
  animationFillMode: 'forwards',
};

const innerChildAnimation: CSSAnimationConfig = {
  animationName: {
    from: {
      opacity: 0,
    },
  },
  animationDuration,
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
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parent: {
    ...flex.center,
    width: 0,
    height: 75,
    backgroundColor: colors.primary,
  },
  child: {
    ...flex.center,
    width: '100%',
    height: 75,
    backgroundColor: colors.primaryDark,
  },
  innerChild: {
    width: 75,
    height: 30,
    backgroundColor: colors.primaryLight,
  },
});
