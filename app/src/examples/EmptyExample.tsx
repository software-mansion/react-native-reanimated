import { Text, TextInput, StyleSheet, View } from 'react-native';

import React, { useEffect, useState } from 'react';

import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function createCircularBuffer(size: number) {
  'worklet';
  const buffer = {
    size: size,
    getSize() {
      return this.size;
    },
    setSize(n) {
      this.size = n;
    },
  };

  return buffer;
}
class CircularBuffer {
  size: number;
  last: number;

  constructor(size: number) {
    this.size = size;
    this.last = -1;
  }
}

export default function EmptyExample() {
  return (
    <View style={styles.container}>
      <PerformanceMonitor />
    </View>
  );
}

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function loopAnimationFrame(fn: (lastTime: number, time: number) => void) {
  let lastTime = 0;

  function loop() {
    requestAnimationFrame((time) => {
      if (lastTime > 0) {
        fn(lastTime, time);
      }
      lastTime = time;
      requestAnimationFrame(loop);
    });
  }

  loop();
}

function fps(deltaInMs: number) {
  'worklet';
  return ((1 / deltaInMs) * 1000).toFixed(3);
}

function JsPerformance() {
  const [jsFps, setJsFps] = useState<string | null>(null);

  useEffect(() => {
    loopAnimationFrame((lastTime, time) => setJsFps(fps(time - lastTime)));
  }, []);

  return (
    <View>
      <Text>JS FPS</Text>
      <Text>{jsFps ?? 'N/A'}</Text>
    </View>
  );
}

function UiPerformance() {
  const uiFps = useSharedValue<string | null>(null);
  const lastTimestamp = useSharedValue<number | null>(null);
  const lastLastTimestamp = useSharedValue<number | null>(null);
  const circularBuffer = useSharedValue(createCircularBuffer(5));

  useFrameCallback((frameInfo) => {
    if (lastTimestamp.value === null) {
      lastTimestamp.value = frameInfo.timestamp;
    } else if (lastLastTimestamp.value === null) {
      lastLastTimestamp.value = lastTimestamp.value;
    } else {
      if (frameInfo.timestamp - lastTimestamp.value < 0) {
        console.log(circularBuffer.value);

        circularBuffer.value.setSize(lastTimestamp.value);
        console.log(circularBuffer.value.getSize());

        console.log({
          t: frameInfo.timestamp,
          pt: lastTimestamp.value,
          ppt: lastLastTimestamp.value,
          d: frameInfo.timestamp - lastTimestamp.value,
        });
      }
      uiFps.value = fps(frameInfo.timestamp - lastTimestamp.value);
      lastLastTimestamp.value = lastTimestamp.value;
      lastTimestamp.value = frameInfo.timestamp;
    }
  });

  const animatedProps = useAnimatedProps(() => {
    const text = uiFps.value ?? 'N/A';
    return { text, defaultValue: text };
  });

  return (
    <View>
      <Text>UI FPS</Text>
      <AnimatedTextInput animatedProps={animatedProps} editable={false} />
    </View>
  );
}

function PerformanceMonitor() {
  const lastPosition = useSharedValue({ xOffset: 0, yOffset: 0 });
  const position = useSharedValue({ x: 0, y: 0 });
  const move = Gesture.Pan()
    .onChange((e) => {
      const { xOffset, yOffset } = lastPosition.value;

      position.value = {
        x: xOffset + e.translationX,
        y: yOffset + e.translationY,
      };
    })
    .onEnd(() => {
      const { x: lastX, y: lastY } = position.value;

      lastPosition.value = { xOffset: lastX, yOffset: lastY };
    });

  const positionStyle = useAnimatedStyle(() => {
    const { x, y } = position.value;
    return {
      top: y,
      left: x,
    };
  });

  return (
    <GestureDetector gesture={move}>
      <Animated.View style={[styles.monitor, positionStyle]}>
        <JsPerformance />
        <UiPerformance />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  monitor: {
    flexDirection: 'row',
    gap: 16,
    borderWidth: 1,
    padding: 8,
    position: 'absolute',
    backgroundColor: '#fff',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
