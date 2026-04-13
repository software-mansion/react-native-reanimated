import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
  WorkletRuntime,
} from 'react-native-worklets';

export default function WorkletRuntimeExample() {
  return (
    <View style={styles.container}>
      <AnimationDemo />
      <ScheduleOnUIscheduleOnRNDemo />
      <CreateWorkletRuntimeDemo />
      <InitializerDemo />
      <ThrowErrorDemo />
      <PerformanceNowDemo />
      <ScheduleOnRuntimeFromJSDemo />
      <ScheduleOnRuntimeFromUIDemo />
      <ScheduleOnRuntimeArgsDemo />
      <ScheduleOnRuntimeLongRunningTasksDemo />
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

function ScheduleOnUIscheduleOnRNDemo() {
  const handlePress = () => {
    const func = () => console.log('Hello from JS thread!');
    scheduleOnUI(() => {
      'worklet';
      console.log('Hello from UI thread!');
      scheduleOnRN(func);
    });
  };

  return <Button title="scheduleOnUI / scheduleOnRN" onPress={handlePress} />;
}

function CreateWorkletRuntimeDemo() {
  const handlePress = () => {
    const runtime = createWorkletRuntime({ name: 'foo' });
    console.log(runtime);
    console.log(runtime.name);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.log(`${runtime}`);
    console.log(String(runtime));
  };

  return <Button title="createWorkletRuntime" onPress={handlePress} />;
}

function InitializerDemo() {
  const handlePress = () => {
    createWorkletRuntime({
      name: 'foo',
      initializer: () => {
        'worklet';
        console.log('Hello from initializer!');
      },
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
    createWorkletRuntime({
      name: 'foo',
      initializer: () => {
        'worklet';
        foo();
      },
    });
  };

  return <Button title="Throw error" onPress={handlePress} />;
}

function PerformanceNowDemo() {
  const handlePress = () => {
    console.log('RN', performance.now());
    createWorkletRuntime({
      name: 'foo',
      initializer: () => {
        'worklet';
        console.log('WR', performance.now());
      },
    });
    scheduleOnUI(() => {
      console.log('UI', performance.now());

      console.log('AT', global._getAnimationTimestamp());
    });
  };

  return <Button title="performance.now" onPress={handlePress} />;
}

function ScheduleOnRuntimeFromJSDemo() {
  const handlePress = () => {
    const runtime = createWorkletRuntime({ name: 'foo' });
    scheduleOnRuntime(runtime, () => {
      'worklet';
      console.log('Hello from background!', Math.random());
    });
  };

  return <Button title="scheduleOnRuntime from JS" onPress={handlePress} />;
}

function ScheduleOnRuntimeFromUIDemo() {
  const handlePress = () => {
    const runtime = createWorkletRuntime({ name: 'foo' });
    scheduleOnUI(() => {
      'worklet';
      const x = Math.random();
      console.log('Hello from UI thread!', x);
      scheduleOnRuntime(runtime, () => {
        'worklet';
        console.log('Hello from background!', x);
      });
    });
  };

  return <Button title="scheduleOnRuntime from UI" onPress={handlePress} />;
}

function ScheduleOnRuntimeArgsDemo() {
  const handlePress = () => {
    const runtime = createWorkletRuntime({ name: 'foo' });
    scheduleOnRuntime(
      runtime,
      (x: number) => {
        'worklet';
        console.log('Hello from background!', x);
      },
      42
    );
  };

  return <Button title="scheduleOnRuntime with args" onPress={handlePress} />;
}

let runtime: WorkletRuntime | undefined;

function ScheduleOnRuntimeLongRunningTasksDemo() {
  const handlePress = () => {
    if (runtime === undefined) {
      runtime = createWorkletRuntime({ name: 'foo' });
    }
    for (let i = 0; i < 3; i++) {
      scheduleOnRuntime(runtime, () => {
        'worklet';
        const until = performance.now() + 500;
        while (performance.now() < until) {
          // do nothing
        }
        console.log('Hello from background!', performance.now());
      });
    }
  };

  return <Button title="Long-running tasks" onPress={handlePress} />;
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
