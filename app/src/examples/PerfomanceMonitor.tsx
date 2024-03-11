import { Text, TextInput, StyleSheet, View } from 'react-native';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type CircularBuffer = ReturnType<typeof createCircularDoublesBuffer>;
function createCircularDoublesBuffer(size: number) {
  'worklet';

  return {
    next: 0 as number,
    buffer: new Float32Array(size),
    size: size,
    count: 0 as number,

    push(value: number): number | null {
      const oldValue = this.buffer[this.next];
      const oldCount = this.count;
      this.buffer[this.next] = value;

      this.next = (this.next + 1) % this.size;
      this.count = Math.min(this.size, this.count + 1);
      return oldCount === this.size ? oldValue : null;
    },

    front(): number | null {
      const atLeastOne = this.count >= 1;
      if (atLeastOne) {
        const current = this.next - 1;
        const index = current < 0 ? this.size - 1 : current;
        return this.buffer[index];
      }
      return null;
    },

    back(): number | null {
      const atLeastOne = this.count >= 1;
      if (atLeastOne) {
        return this.buffer[this.next];
      }
      return null;
    },

    reduce<T>(fn: (acc: T, value: number) => T, initial: T) {
      let i = 0;
      let acc = initial;
      while (i < this.count) {
        const offset = (this.next + i) % this.size;
        acc = fn(acc, this.buffer[offset]);
        ++i;
      }
      return acc;
    },
  } as const;
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

function fps(renderTimeInMs: number) {
  'worklet';
  return ((1 / renderTimeInMs) * 1000).toFixed(3);
}

function JsPerformance() {
  const totalRenderTime = useSharedValue(0);
  const circularBuffer = createCircularDoublesBuffer(100);
  const [jsFps, setJsFps] = useState<string | null>(null)
  
  useEffect(() => {
    loopAnimationFrame((lastTime, time) => {
      const timestamp = Math.round(time);
      const previousTimestamp = Math.round(lastTime) ?? timestamp;

      const droppedTimestamp = circularBuffer.push(timestamp);
      const nextToDrop = circularBuffer.back()!;
  
      const delta = timestamp - previousTimestamp;
      const droppedDelta = droppedTimestamp !== null ? nextToDrop - droppedTimestamp : 0;
      totalRenderTime.value += delta - droppedDelta;
      const currentFps = fps(totalRenderTime.value / circularBuffer.count);
      
      return setJsFps(currentFps);
    });
  }, []);

  return (
    <View>
      <Text>JS FPS</Text>
      <Text style={styles.text}>{jsFps ?? 'N/A'}</Text>
    </View>
  );
}

function UiPerformance() {
  const uiFps = useSharedValue<string | null>(null);
  const totalRenderTime = useSharedValue(0);
  const circularBuffer = useRef<CircularBuffer | null>(null);

  useFrameCallback(({ timestamp }) => {
    if (circularBuffer.current === null) {
      circularBuffer.current = createCircularDoublesBuffer(100);
    }

    timestamp = Math.round(timestamp);
    const buffer = circularBuffer.current;
    const previousTimestamp = buffer.front() ?? timestamp;
    const droppedTimestamp = buffer.push(timestamp);
    const nextToDrop = buffer.back()!;

    const delta = timestamp - previousTimestamp;
    const droppedDelta =
      droppedTimestamp !== null ? nextToDrop - droppedTimestamp : 0;
    totalRenderTime.value += delta - droppedDelta;
    uiFps.value = fps(totalRenderTime.value / buffer.count);
  });

  const animatedProps = useAnimatedProps(() => {
    const text = uiFps.value ?? 'N/A';
    return { text, defaultValue: text };
  });

  return (
    <View>
      <Text>UI FPS</Text>
      <AnimatedTextInput
        style={styles.text}
        animatedProps={animatedProps}
        editable={false}
      />
    </View>
  );
}

export function PerformanceMonitor() {
  const lastPosition = useSharedValue({ xOffset: 0, yOffset: 0 });
  const position = useSharedValue({ x: 0, y: 0 });
  const move = useMemo(
    () =>
      Gesture.Pan()
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
        }),
    [lastPosition, position]
  );
  const positionStyle = useAnimatedStyle(() => {
    const { x, y } = position.value;
    return {
      transform: [{ translateX: x }, { translateY: y }],
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
  text: {
    width: 50,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
