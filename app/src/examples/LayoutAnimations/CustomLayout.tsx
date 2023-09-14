import Animated, {
  LayoutAnimationFunction,
  makeMutable,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Button, StyleSheet, Text, View } from 'react-native';
import React, { useState } from 'react';

function CustomLayoutTransiton(): LayoutAnimationFunction {
  const isEven = makeMutable(1);
  return (values) => {
    'worklet';
    const isEvenLocal = isEven.value;
    isEven.value = 1 - isEven.value;

    return {
      animations: {
        originX: withDelay(
          isEvenLocal ? 1000 : 0,
          withTiming(values.targetOriginX, { duration: 1000 })
        ),
        originY: withDelay(
          isEvenLocal ? 0 : 1000,
          withTiming(values.targetOriginY, { duration: 1000 })
        ),
        width: withTiming(values.targetWidth, { duration: 1000 }),
        height: withTiming(values.targetHeight, { duration: 1000 }),
        backgroundColor: withSequence(
          withTiming('blue', { duration: 1000 }),
          withTiming('red', { duration: 1000 })
        ),
      },
      initialValues: {
        originX: values.currentOriginX,
        originY: values.currentGlobalOriginY,
        width: values.currentWidth,
        height: values.currentHeight,
        backgroundColor: 'red',
      },
    };
  };
}

function Box({ label, state }: { label: string; state: boolean }) {
  return (
    <Animated.View
      layout={CustomLayoutTransiton()}
      style={[styles.box, { height: state ? 30 : 60 }]}>
      <Text> {label} </Text>
    </Animated.View>
  );
}

export default function CustomLayoutAnimationScreen() {
  const [state, setState] = useState(true);
  return (
    <View style={styles.marginTop}>
      <View style={styles.height}>
        <View
          style={[{ flexDirection: state ? 'row' : 'column' }, styles.border]}>
          <Box key="a" label="A" state={state} />
          <Box key="b" label="B" state={state} />
          <Box key="c" label="C" state={state} />
        </View>
      </View>

      <Button
        onPress={() => {
          setState(!state);
        }}
        title="toggle"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  marginTop: {
    marginTop: 30,
  },
  height: {
    height: 300,
  },
  box: {
    margin: 20,
    padding: 5,
    borderWidth: 1,
    borderColor: 'black',
    width: 60,
    height: 60,
  },
  border: {
    borderWidth: 1,
  },
});
