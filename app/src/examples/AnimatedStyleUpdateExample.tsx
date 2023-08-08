import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  runOnUI,
  runOnJS,
  createWorkletRuntime,
  runOnRuntimeSync,
} from 'react-native-reanimated';
import { View, Button, StyleSheet, Alert } from 'react-native';
import React from 'react';
import { makeShareableCloneRecursive } from 'react-native-reanimated/src/reanimated2/shareables';

export default function AnimatedStyleUpdateExample(): React.ReactElement {
  const randomWidth = useSharedValue(10);

  const config = {
    duration: 500,
    easing: Easing.bezierFn(0.5, 0.01, 0, 1),
  };

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(randomWidth.value, config),
    };
  });

  const handlePress1 = () => {
    const func = () => console.log('xd1');
    runOnUI(() => {
      'worklet';
      runOnJS(func)();
    })();
  };

  const handlePress2 = () => {
    global._scheduleOnJS(
      makeShareableCloneRecursive(console.log),
      makeShareableCloneRecursive(['xd2'])
    );
  };

  const handlePress3 = () => {
    const runtime = createWorkletRuntime('foo');
    console.log(runtime);
    console.log(`${runtime}`);
    console.log(String(runtime));
  };

  const handlePress4 = () => {
    const runtime = createWorkletRuntime('foo');
    runOnRuntimeSync(runtime, () => {
      'worklet';
      console.log('Hello from runtime');
    });
  };

  const handlePress5 = () => {
    function bar() {
      'worklet';
      throw new Error('Hello world!');
    }
    function foo() {
      'worklet';
      bar();
    }
    runOnUI(() => {
      foo();
    })();
  };

  const handlePress6 = () => {
    const runtime = createWorkletRuntime('foo');
    function bar() {
      'worklet';
      throw new Error('Hello world!');
    }
    function foo() {
      'worklet';
      bar();
    }
    runOnRuntimeSync(runtime, () => {
      'worklet';
      foo();
    });
  };

  const handlePress7 = () => {
    Alert.prompt('Enter label of runtime', '', (label) => {
      global.runtime = createWorkletRuntime(label);
    });
  };

  const handlePress8 = () => {
    runOnRuntimeSync(global.runtime, () => {
      'worklet';
      console.log('xd');
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, style]} />
      <Button
        title="toggle"
        onPress={() => {
          randomWidth.value = Math.random() * 350;
        }}
      />
      <Button title="runOnUI / runOnJS" onPress={handlePress1} />
      <Button title="_scheduleOnJS" onPress={handlePress2} />
      <Button title="createWorkletRuntime" onPress={handlePress3} />
      <Button title="runOnRuntimeSync" onPress={handlePress4} />
      <Button title="throw new Error UI" onPress={handlePress5} />
      <Button title="throw new Error new" onPress={handlePress6} />
      <Button title="spawn new runtime" onPress={handlePress7} />
      <Button title="invoke new runtime" onPress={handlePress8} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  box: {
    width: 100,
    height: 80,
    backgroundColor: 'black',
    margin: 30,
  },
});
