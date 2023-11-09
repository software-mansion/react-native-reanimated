import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  BackgroundQueue,
  Easing,
  WorkletRuntime,
  createBackgroundQueue,
  createWorkletRuntime,
  runOnBackgroundQueue,
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
      <PerformanceNowDemo />
      <BackgroundQueueFromJSDemo />
      <BackgroundQueueFromUIDemo />
      <BackgroundQueueLongRunningTasksDemo />
      <BackgroundQueueArgsDemo />
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

function PerformanceNowDemo() {
  const handlePress = () => {
    console.log('RN', performance.now());
    createWorkletRuntime('foo', () => {
      'worklet';
      console.log('WR', performance.now());
    });
    runOnUI(() => {
      console.log('UI', performance.now());
      // @ts-ignore it works
      console.log('AT', _getAnimationTimestamp());
    })();
  };

  return <Button title="performance.now" onPress={handlePress} />;
}

function BackgroundQueueFromJSDemo() {
  const handlePress = () => {
    const runtime = createWorkletRuntime('foo');
    const queue = createBackgroundQueue('bar');
    runOnBackgroundQueue(queue, runtime, () => {
      'worklet';
      console.log('Hello from background!', Math.random());
    })();
  };

  return <Button title="Background queue from JS" onPress={handlePress} />;
}

function BackgroundQueueFromUIDemo() {
  const handlePress = () => {
    const runtime = createWorkletRuntime('foo');
    const queue = createBackgroundQueue('bar');
    runOnUI(() => {
      'worklet';
      const x = Math.random();
      console.log('Hello from UI thread!', x);
      runOnBackgroundQueue(queue, runtime, () => {
        'worklet';
        console.log('Hello from background!', x);
      })();
    })();
  };

  return <Button title="Background queue from UI" onPress={handlePress} />;
}

let queue: BackgroundQueue | undefined;
let runtime: WorkletRuntime | undefined;

function BackgroundQueueLongRunningTasksDemo() {
  const handlePress = () => {
    if (queue === undefined) {
      queue = createBackgroundQueue('bar');
    }
    if (runtime === undefined) {
      runtime = createWorkletRuntime('foo');
    }
    for (let i = 0; i < 3; i++) {
      runOnBackgroundQueue(queue, runtime, () => {
        'worklet';
        const until = performance.now() + 500;
        while (performance.now() < until) {}
        console.log('Hello from background!', performance.now());
      })();
    }
  };

  return <Button title="Long-running tasks" onPress={handlePress} />;
}

function BackgroundQueueArgsDemo() {
  const handlePress = () => {
    const runtime = createWorkletRuntime('foo');
    const queue = createBackgroundQueue('bar');
    runOnBackgroundQueue(queue, runtime, (x: number) => {
      'worklet';
      console.log('Hello from background!', x);
    })(42);
  };

  return <Button title="Background queue args" onPress={handlePress} />;
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
