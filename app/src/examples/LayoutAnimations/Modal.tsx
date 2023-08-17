import Animated, {
  EntryAnimationsValues,
  EntryExitAnimationFunction,
  ExitAnimationsValues,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Button, StyleSheet, Text, View } from 'react-native';
import React, { useState } from 'react';

function AnimatedView() {
  const style = useAnimatedStyle(() => {
    return {};
  });

  const entering: EntryExitAnimationFunction = (
    targetValues: EntryAnimationsValues
  ) => {
    'worklet';

    return {
      initialValues: {
        transform: [
          { translateY: targetValues.targetHeight / 2 },
          { perspective: 500 },
          { rotateX: '90deg' },
          { translateY: -targetValues.targetHeight / 2 },
          { translateY: 300 },
        ],
      },
      animations: {
        transform: [
          { translateY: withTiming(targetValues.targetHeight / 2) },
          { perspective: withTiming(500) },
          { rotateX: withTiming('0deg') },
          { translateY: withTiming(-targetValues.targetHeight / 2) },
          { translateY: withTiming(0) },
        ],
      },
    };
  };

  const exiting: EntryExitAnimationFunction = (
    targetValues: ExitAnimationsValues
  ) => {
    'worklet';

    return {
      initialValues: {
        transform: [
          { translateY: targetValues.currentHeight / 2 },
          { perspective: 500 },
          { rotateX: '0deg' },
          { translateY: -targetValues.currentHeight / 2 },
          { translateY: 0 },
        ],
      },
      animations: {
        transform: [
          { translateY: withTiming(targetValues.currentHeight / 2) },
          { perspective: withTiming(500) },
          { rotateX: withTiming('90deg') },
          { translateY: withTiming(-targetValues.currentHeight / 2) },
          { translateY: withTiming(300) },
        ],
      },
    };
  };

  return (
    <Animated.View
      {...{ entering, exiting }}
      style={[styles.animatedView, style]}>
      <Text> kk </Text>
    </Animated.View>
  );
}

export default function Modal() {
  const [show, setShow] = useState(true);
  return (
    <View style={styles.container}>
      <Button
        title="toggle"
        onPress={() => {
          setShow((last) => !last);
        }}
      />
      <View style={styles.animatedViewContainer}>
        {show && <AnimatedView />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column-reverse',
  },
  animatedViewContainer: {
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  animatedView: {
    height: 300,
    width: 200,
    borderWidth: 1,
    borderColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'red',
  },
});
