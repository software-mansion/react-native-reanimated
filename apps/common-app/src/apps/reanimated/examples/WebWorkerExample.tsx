import React, { useEffect, useMemo, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import type { LayoutAnimationFunction } from 'react-native-reanimated';
import Animated, {
  makeMutable,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { myWorker, performHeavyComputation } from './WebWorker';

function CustomLayoutTransition(): LayoutAnimationFunction {
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
        backgroundColor: 'red',
      },
    };
  };
}

function Box({ label, state }: { label: string; state: boolean }) {
  const layoutTransition = useMemo(CustomLayoutTransition, []);
  return (
    <Animated.View
      layout={layoutTransition}
      style={[styles.box, { height: state ? 30 : 60 }]}>
      <Text> {label} </Text>
    </Animated.View>
  );
}

export default function WebWorkerExample() {
  const [state, setState] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prevState) => !prevState);
    }, 3000); // Toggle every 3 seconds

    return () => clearInterval(interval);
  }, []);


  return (
    <View style={styles.marginTop}>
      <View style={styles.height}>
        <View
          style={[{ flexDirection: state ? 'row' : 'column' }, styles.border]}>
          <Box key="a" label="A" state={state} />
          <Box key="b" label="B" state={state} />
          <Box key="c" label="C" state={state} />
          <Box key="d" label="D" state={state} />
        </View>
      </View>

      <Button
        onPress={() => {
          myWorker.postMessage('started');
        }}
        title="send message"
      />

      <Button
        onPress={() => {
          performHeavyComputation();
        }}
        title="perform heavy computation"
      />

      <Button
        onPress={() => {
          myWorker.terminate();
        }}
        title="terminate worker"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  marginTop: {
    marginTop: 30,
  },
  height: {
    height: 400,
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