import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import Animated, {
  makeMutable,
  withTiming,
  withDelay,
  LayoutAnimationFunction,
} from 'react-native-reanimated';

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
      },
      initialValues: {
        originX: values.currentOriginX,
        originY: values.currentGlobalOriginY,
        width: values.currentWidth,
        height: values.currentHeight,
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

export function CustomLayoutAnimationScreen(): React.ReactElement {
  const [state, setState] = useState(true);
  return (
    <View style={{ marginTop: 30 }}>
      <View style={{ height: 300 }}>
        <View
          style={{ flexDirection: state ? 'row' : 'column', borderWidth: 1 }}>
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
  box: {
    margin: 20,
    padding: 5,
    borderWidth: 1,
    borderColor: 'black',
    width: 60,
    height: 60,
  },
});
