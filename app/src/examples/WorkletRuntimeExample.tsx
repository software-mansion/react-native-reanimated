import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  createWorkletRuntime,
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function WorkletRuntimeExample() {
  return (
    <View style={styles.container}>
      <AnimationDemo />
      <RunOnUIRunOnJSDemo />
      <CreateWorkletRuntimeDemo />
      <InitializerDemo />
      <ThrowErrorDemo />
    </View>
  );
}

function AnimationDemo() {
  const sv = useSharedValue(10);

  const config = {
    duration: 500,
    easing: Easing.bezierFn(0.5, 0.01, 0, 1),
  };

  const style = useAnimatedStyle(() => {
    return {
      width: sv.value,
      backgroundColor: `hsl(${sv.value}, 100%, 50%)`,
    };
  });

  const handlePress = () => {
    sv.value = withTiming(Math.random() * 360, config);
  };

  return (
    <>
      <Button title="Run animation" onPress={handlePress} />
      <Animated.View style={[styles.box, style]} />
    </>
  );
}

function RunOnUIRunOnJSDemo() {
  const handlePress = () => {
    const func = () => console.log('Hello from JS thread!');
    runOnUI(() => {
      'worklet';
      console.log('Hello from UI thread!');
      runOnJS(func)();
    })();
  };

  return <Button title="runOnUI / runOnJS" onPress={handlePress} />;
}

function CreateWorkletRuntimeDemo() {
  const handlePress = () => {
    const runtime = createWorkletRuntime('foo');
    console.log(runtime);
    console.log(runtime.name);
    console.log(`${runtime}`);
    console.log(String(runtime));
  };

  return <Button title="createWorkletRuntime" onPress={handlePress} />;
}

function InitializerDemo() {
  const handlePress = () => {
    createWorkletRuntime('foo', () => {
      'worklet';
      console.log('Hello from initializer!');
    });
  };

  return <Button title="Initializer" onPress={handlePress} />;
}

function ThrowErrorDemo() {
  const handlePress = () => {
    function bar() {
      'worklet';
      throw new Error('Hello world!');
    }
    function foo() {
      'worklet';
      bar();
    }
    createWorkletRuntime('foo', () => {
      'worklet';
      foo();
    });
  };

  return <Button title="Throw error" onPress={handlePress} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    height: 40,
  },
});
