import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  runOnUI,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useScrollOffset,
  useSharedValue,
} from 'react-native-reanimated';

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
    <GestureHandlerRootView style={styles.height100}>
      <GestureDetector gesture={gesture}>
        <View style={styles.tomatoBox}>
          <Text>GestureDetector</Text>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

function ThrowErrorFromUseAnimatedScrollHandlerDemo() {
  const scrollHandler = useAnimatedScrollHandler(() => {
    throw Error('Hello world from useAnimatedScrollHandler');
  });

  return (
    <View style={styles.height100}>
      <Animated.ScrollView onScroll={scrollHandler}>
        <View style={styles.limeBox}>
          <Text>useAnimatedScrollHandler</Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function ThrowErrorFromuseScrollOffsetDemo() {
  const aref = useAnimatedRef<Animated.ScrollView>();

  const offset = useScrollOffset(aref);

  useAnimatedStyle(() => {
    if (_WORKLET && offset.value > 0) {
      throw Error('Hello world from useScrollOffset');
    }
    return {};
  });

  return (
    <View style={styles.height100}>
      <Animated.ScrollView ref={aref}>
        <View style={styles.cyanBox}>
          <Text>useScrollOffset + useAnimatedStyle</Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

export default function WorkletExample() {
  return (
    <View style={styles.container}>
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
      <ThrowErrorFromUseAnimatedScrollHandlerDemo />
      <ThrowErrorFromuseScrollOffsetDemo />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  height100: {
    height: 100,
  },
  tomatoBox: {
    width: 100,
    height: 100,
    backgroundColor: 'tomato',
  },
  limeBox: {
    width: 100,
    height: 500,
    backgroundColor: 'lime',
  },
  cyanBox: {
    width: 100,
    height: 500,
    backgroundColor: 'cyan',
  },
});
