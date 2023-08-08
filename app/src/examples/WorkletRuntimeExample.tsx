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
import { View, Button, StyleSheet } from 'react-native';
import React from 'react';
import { makeShareableCloneRecursive } from 'react-native-reanimated/src/reanimated2/shareables';

export default function WorkletRuntimeExample() {
  return (
    <View style={styles.container}>
      <AnimationDemo />
      <RunOnUIRunOnJSDemo />
      <ScheduleOnJSDemo />
      <CreateWorkletRuntimeDemo />
      <RunOnRuntimeSyncDemo />
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

function ScheduleOnJSDemo() {
  const handlePress = () => {
    global._scheduleOnJS(
      makeShareableCloneRecursive(console.log),
      makeShareableCloneRecursive(['Hello from JS thread!'])
    );
  };

  return <Button title="_scheduleOnJS" onPress={handlePress} />;
}

function CreateWorkletRuntimeDemo() {
  const handlePress = () => {
    const runtime = createWorkletRuntime('foo');
    console.log(runtime);
    console.log(`${runtime}`);
    console.log(String(runtime));
  };

  return <Button title="createWorkletRuntime" onPress={handlePress} />;
}

function RunOnRuntimeSyncDemo() {
  const handlePress = () => {
    const runtime = createWorkletRuntime('foo', () => {
      'worklet';
      console.log('Worklet runtime created successfully!');
    });
    runOnRuntimeSync(runtime, () => {
      'worklet';
      console.log('Hello from worklet runtime!');
    });
  };

  return <Button title="runOnRuntimeSync" onPress={handlePress} />;
}

function ThrowErrorDemo() {
  const handlePress = () => {
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
