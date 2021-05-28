import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  AnimatedLayout,
  withTiming,
  withDelay,
  layout,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

function AnimatedView() {
  const entering = (targetValues) => {
    'worklet';
    const animations = {
      originX: withTiming(targetValues.originX, { duration: 3000 }),
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

  const exiting = (startingValues) => {
    'worklet';
    const animations = {
      originX: withTiming(width, { duration: 3000 }),
      opacity: withTiming(0.5, { duration: 2000 }),
    };
    const initialValues = {
      originX: startingValues.originX,
      opacity: 1,
    };

    return {
      animations,
      initialValues,
    };
  };

  return (
    <Animated.View
      style={[styles.animatedView]}
      {...{ entering, exiting, layout }}>
      <Text> kk </Text>
    </Animated.View>
  );
}

export function ModalNewAPI(): React.ReactElement {
  const [show, setShow] = useState(false);
  return (
    <View style={{ flexDirection: 'column-reverse' }}>
      <AnimatedLayout>
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
      </AnimatedLayout>
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
