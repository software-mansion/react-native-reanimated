import React, { useState, useRef } from 'react';
import { View, Text, Button, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  withTiming,
  withDelay,
  EntryExitAnimationFunction,
  Layout,
  EntryAnimationsValues,
  ExitAnimationsValues,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

function AnimatedView() {
  const ref = useRef(null);
  const entering: EntryExitAnimationFunction = (
    targetValues: EntryAnimationsValues
  ) => {
    'worklet';
    const animations = {
      originX: withTiming(targetValues.targetOriginX, { duration: 3000 }),
      opacity: withTiming(1, { duration: 2000 }),
      borderRadius: withDelay(4000, withTiming(30, { duration: 3000 })),
      transform: [
        { rotate: withTiming('0deg', { duration: 4000 }) },
        { scale: withTiming(1, { duration: 3500 }) },
      ],
    };
    const initialValues = {
      originX: -width,
      opacity: 0,
      borderRadius: 10,
      transform: [{ rotate: '90deg' }, { scale: 0.5 }],
    };
    return {
      initialValues,
      animations,
    };
  };

  const exiting: EntryExitAnimationFunction = (
    startingValues: ExitAnimationsValues
  ) => {
    'worklet';
    const animations = {
      originX: withTiming(width, { duration: 3000 }),
      opacity: withTiming(0.5, { duration: 2000 }),
    };
    const initialValues = {
      originX: startingValues.currentOriginX,
      opacity: 1,
    };

    return {
      animations,
      initialValues,
    };
  };

  return (
    <Animated.View
      ref={ref}
      style={[styles.animatedView]}
      {...{ entering, exiting, layout: Layout }}>
      <Text> kk </Text>
    </Animated.View>
  );
}

export function ModalNewAPI(): React.ReactElement {
  const [show, setShow] = useState(false);
  return (
    <View style={{ flexDirection: 'column-reverse' }}>
      <Button
        title="toggle"
        onPress={() => {
          setShow((last) => !last);
        }}
      />
      <View
        style={{
          height: 400,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
        }}>
        {show && <AnimatedView />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
