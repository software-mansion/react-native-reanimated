/* eslint-disable react-native/no-inline-styles */
/* global _WORKLET */
import Animated, {
  runOnJS,
  runOnUI,
  useAnimatedGestureHandler,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useScrollViewOffset,
  useSharedValue,
} from 'react-native-reanimated';
import { Button, Text, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  PanGestureHandler,
} from 'react-native-gesture-handler';

import React from 'react';

declare global {
  const _WORKLET: boolean;
}

function RunOnUIDemo() {
  const someWorklet = (x: number) => {
    'worklet';
    console.log(_WORKLET, x); // _WORKLET should be true
  };

  const handlePress = () => {
    runOnUI(someWorklet)(Math.random());
  };

  return <Button onPress={handlePress} title="runOnUI demo" />;
}

function RunOnUIRunOnJSDemo() {
  const someFunction = (x: number) => {
    console.log(_WORKLET, x); // _WORKLET should be false
  };

  const someWorklet = (x: number) => {
    'worklet';
    console.log(_WORKLET, x); // _WORKLET should be true
    runOnJS(someFunction)(x);
  };

  const handlePress = () => {
    runOnUI(someWorklet)(Math.random());
  };

  return <Button onPress={handlePress} title="runOnUI + runOnJS demo" />;
}

function UseDerivedValueRunOnJSDemo() {
  const sv = useSharedValue(0);

  const someFunction = (x: number) => {
    console.log(_WORKLET, x); // _WORKLET should be false
  };

  useDerivedValue(() => {
    console.log(_WORKLET, sv.value);
    runOnJS(someFunction)(sv.value);
  });

  const handlePress = () => {
    sv.value = 1 + Math.random();
  };

  return (
    <Button onPress={handlePress} title="useDerivedValue + runOnJS demo" />
  );
}

function ThrowErrorDemo() {
  const handlePress = () => {
    throw new Error('Hello world from React Native JS!');
  };

  return <Button onPress={handlePress} title="Throw error on JS" />;
}

function ThrowErrorWorkletDemo() {
  const someWorklet = () => {
    'worklet';
    throw new Error('Hello world from worklet!');
  };

  const handlePress = () => {
    runOnUI(someWorklet)();
  };

  return <Button onPress={handlePress} title="Throw error from worklet" />;
}

function ThrowErrorNestedWorkletDemo() {
  const innerWorklet = () => {
    'worklet';
    throw new Error('Hello world from nested worklet!');
  };

  const outerWorklet = () => {
    'worklet';
    innerWorklet();
  };

  const handlePress = () => {
    runOnUI(outerWorklet)();
  };

  return (
    <Button onPress={handlePress} title="Throw error from nested worklet" />
  );
}

function ThrowErrorFromUseAnimatedStyleDemo() {
  const sv = useSharedValue(0);

  useAnimatedStyle(() => {
    if (!_WORKLET || sv.value === 0) {
      return {}; // prevent throwing error on first render or from JS context
    }
    throw new Error('Hello world from useAnimatedStyle!');
  });

  const handlePress = () => {
    sv.value = 1 + Math.random();
  };

  return (
    <Button onPress={handlePress} title="Throw error from useAnimatedStyle" />
  );
}

function ThrowErrorFromUseDerivedValueDemo() {
  const sv = useSharedValue(0);

  useDerivedValue(() => {
    if (!_WORKLET || sv.value === 0) {
      return {}; // prevent throwing error on first render or from JS context
    }
    throw new Error('Hello world from useDerivedValue!');
  }, [sv]);

  const handlePress = () => {
    sv.value = 1 + Math.random();
  };

  return (
    <Button onPress={handlePress} title="Throw error from useDerivedValue" />
  );
}

function ThrowErrorFromUseFrameCallbackDemo() {
  const sv = useSharedValue(false);

  useFrameCallback(() => {
    if (sv.value) {
      sv.value = false;
      throw new Error('Hello world from useFrameCallback!');
    }
  }, true);

  const handlePress = () => {
    sv.value = true;
  };

  return (
    <Button onPress={handlePress} title="Throw error from useFrameCallback" />
  );
}

function ThrowErrorFromGestureDetectorDemo() {
  const gesture = Gesture.Pan().onChange(() => {
    throw Error('Hello world from GestureDetector callback!');
  });

  return (
    <GestureHandlerRootView>
      <GestureDetector gesture={gesture}>
        <View style={{ width: 100, height: 100, backgroundColor: 'tomato' }}>
          <Text>GestureDetector</Text>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

function ThrowErrorFromUseAnimatedGestureHandlerDemo() {
  const gestureHandler = useAnimatedGestureHandler({
    onActive: () => {
      throw Error('Hello world from useAnimatedGestureHandler');
    },
  });

  return (
    <GestureHandlerRootView>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View
          style={{ width: 100, height: 100, backgroundColor: 'gold' }}>
          <Text>PanGestureHandler + useAnimatedGestureHandler</Text>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

function ThrowErrorFromUseAnimatedScrollHandlerDemo() {
  const scrollHandler = useAnimatedScrollHandler(() => {
    throw Error('Hello world from useAnimatedScrollHandler');
  });

  return (
    <View style={{ height: 100 }}>
      <Animated.ScrollView scrollEventThrottle={16} onScroll={scrollHandler}>
        <View
          style={{
            width: 100,
            height: 500,
            backgroundColor: 'lime',
          }}>
          <Text>useAnimatedScrollHandler</Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function ThrowErrorFromUseScrollViewOffsetDemo() {
  const aref = useAnimatedRef<Animated.ScrollView>();

  const offset = useScrollViewOffset(aref);

  useAnimatedStyle(() => {
    if (_WORKLET && offset.value > 0) {
      throw Error('Hello world from useScrollViewOffset');
    }
    return {};
  });

  return (
    <View style={{ height: 100 }}>
      <Animated.ScrollView scrollEventThrottle={16} ref={aref}>
        <View
          style={{
            width: 100,
            height: 500,
            backgroundColor: 'cyan',
          }}>
          <Text>useScrollViewOffset + useAnimatedStyle</Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

export default function WorkletExample() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <RunOnUIDemo />
      <RunOnUIRunOnJSDemo />
      <UseDerivedValueRunOnJSDemo />
      <ThrowErrorDemo />
      <ThrowErrorWorkletDemo />
      <ThrowErrorNestedWorkletDemo />
      <ThrowErrorFromUseAnimatedStyleDemo />
      <ThrowErrorFromUseDerivedValueDemo />
      <ThrowErrorFromUseFrameCallbackDemo />
      <ThrowErrorFromGestureDetectorDemo />
      <ThrowErrorFromUseAnimatedGestureHandlerDemo />
      <ThrowErrorFromUseAnimatedScrollHandlerDemo />
      <ThrowErrorFromUseScrollViewOffsetDemo />
    </View>
  );
}
