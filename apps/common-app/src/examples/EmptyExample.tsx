/* eslint-disable react-hooks/rules-of-hooks */
import { Text, StyleSheet, View } from 'react-native';

import React from 'react';
import type { ExtrapolationType } from 'react-native-reanimated';
import Animated, {
  getViewProp,
  interpolate,
  interpolateColor,
  measure,
  runOnUI,
  useAnimatedReaction,
  useAnimatedRef,
  withSequence,
} from 'react-native-reanimated';

const EXAMPLE_NUMBER: number = 2;

if (EXAMPLE_NUMBER === 4) {
  /*
  4.
  Error: [Reanimated] Property `text` was whitelisted both as UI and native prop. Please remove it from one of the lists.
  */
  Animated.addWhitelistedNativeProps({ text: true });
  Animated.addWhitelistedUIProps({ text: true });
}

export default function EmptyExample() {
  if (EXAMPLE_NUMBER === 1) {
    /* 
    1.
    [Reanimated] Tried to modify key `value` of an object which has been already passed to a worklet. See
    https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#tried-to-modify-key-of-an-object-which-has-been-converted-to-a-shareable
    for more details.
   */
    const a = { value: 1 };
    runOnUI(() => {
      console.log(a);
    })();
    a.value = 2;
  }

  if (EXAMPLE_NUMBER === 2) {
    /* 
    2.
    [Reanimated] No animation was provided for the sequence
   */
    // withSequence();

    // runOnUI(() => {
    //   withSequence();
    // })();

    useAnimatedReaction(
      () => null,
      () => {
        withSequence();
      }
    );
  }

  if (EXAMPLE_NUMBER === 3) {
    /*
    3.
    [Reanimated] The view with tag -1 is not a valid argument for measure(). This may be because the view is not currently rendered, which may not be a bug (e.g. an off-screen FlatList item).
    */
    const aref = useAnimatedRef();

    runOnUI(() => {
      measure(aref);
    })();
  }

  if (EXAMPLE_NUMBER === 4) {
    /*
    4.
    ReanimatedError: [Reanimated] Unsupported value for "interpolate"
    Supported values: ["extend", "clamp", "identity", Extrapolatation.CLAMP, Extrapolatation.EXTEND, Extrapolatation.IDENTITY]
    Valid example:
            interpolate(value, [inputRange], [outputRange], "clamp"), js engine: reanimated
    */
    useAnimatedReaction(
      () => null,
      () => {
        interpolate(
          0,
          [0, 1],
          [0, 1],
          'Invalid interpolation' as ExtrapolationType
        );
      }
    );
  }

  if (EXAMPLE_NUMBER === 5) {
    /*
    5.
    ReanimatedError: [Reanimated] Interpolation input and output ranges should contain at least two values., js engine: reanimated
    */
    useAnimatedReaction(
      () => null,
      () => {
        interpolate(0, [0], [0, 1]);
      }
    );
  }

  if (EXAMPLE_NUMBER === 6) {
    /*
    6.
    ReanimatedError: [Reanimated] Invalid color space provided: Invalid color space. Supported values are: ['RGB', 'HSV']., js engine: reanimated
    */
    useAnimatedReaction(
      () => null,
      () => {
        interpolateColor(
          0,
          [0, 1],
          ['red', 'blue'],
          'Invalid color space' as 'RGB'
        );
      }
    );
  }

  if (EXAMPLE_NUMBER === 7) {
    /*
    7.
    ReanimatedError: 
    */
    getViewProp(0, 'opacity').catch(() => null);
  }

  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
