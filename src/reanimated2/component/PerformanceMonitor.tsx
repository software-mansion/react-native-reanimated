'use strict';

import React, { useEffect, useRef } from 'react';
import { Text, TextInput, StyleSheet, View } from 'react-native';

import type { FrameInfo } from '../frameCallback';
import type { SharedValue } from '../commonTypes';
import { useSharedValue, useAnimatedProps, useFrameCallback } from '../hook';
import { createAnimatedComponent } from '../../createAnimatedComponent';
import { addWhitelistedNativeProps } from '../../ConfigHelper';

type CircularBuffer = ReturnType<typeof createCircularDoublesBuffer>;
function createCircularDoublesBuffer(size: number) {
  'worklet';

  return {
    next: 0 as number,
    buffer: new Float32Array(size),
    size,
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
      const notEmpty = this.count > 0;
      if (notEmpty) {
        const current = this.next - 1;
        const index = current < 0 ? this.size - 1 : current;
        return this.buffer[index];
      }
      return null;
    },

    back(): number | null {
      const notEmpty = this.count > 0;
      return notEmpty ? this.buffer[this.next] : null;
    },
  };
}

const DEFAULT_BUFFER_SIZE = 60;
addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = createAnimatedComponent(TextInput);

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

function getFps(renderTimeInMs: number): string {
  'worklet';
  return (1000 / renderTimeInMs).toFixed(1);
}

function getTimeDelta(
  timestamp: number,
  previousTimestamp: number | null
): number {
  'worklet';
  return previousTimestamp !== null ? timestamp - previousTimestamp : 0;
}

function completeBufferRoutine(
  buffer: CircularBuffer,
  timestamp: number,
  previousTimestamp: number,
  totalRenderTime: SharedValue<number>
) {
  'worklet';
  timestamp = Math.round(timestamp);
  previousTimestamp = Math.round(previousTimestamp) ?? timestamp;

  const droppedTimestamp = buffer.push(timestamp);
  const nextToDrop = buffer.back()!;

  const delta = getTimeDelta(timestamp, previousTimestamp);
  const droppedDelta = getTimeDelta(nextToDrop, droppedTimestamp);

  totalRenderTime.value += delta - droppedDelta;
  return getFps(totalRenderTime.value / buffer.count);
}

function JsPerformance() {
  const jsFps = useSharedValue<string | null>(null);
  const totalRenderTime = useSharedValue(0);
  const circularBuffer = createCircularDoublesBuffer(DEFAULT_BUFFER_SIZE);

  useEffect(() => {
    loopAnimationFrame((lastTime, time) => {
      const currentFps = completeBufferRoutine(
        circularBuffer,
        time,
        lastTime,
        totalRenderTime
      );

      jsFps.value = currentFps;
    });
  });

  const animatedProps = useAnimatedProps(() => {
    const text = jsFps.value ?? 'N/A';
    return { text, defaultValue: text };
  });

  return (
    <View style={styles.container}>
      <Text style={styles.headers}>JS FPS</Text>
      <AnimatedTextInput
        style={styles.text}
        animatedProps={animatedProps}
        editable={false}
      />
    </View>
  );
}

function UiPerformance() {
  const uiFps = useSharedValue<string | null>(null);
  const totalRenderTime = useSharedValue(0);
  const circularBuffer = useRef<CircularBuffer | null>(null);

  useFrameCallback(({ timestamp }: FrameInfo) => {
    if (circularBuffer.current === null) {
      circularBuffer.current = createCircularDoublesBuffer(DEFAULT_BUFFER_SIZE);
    }
    const previousTimestamp = circularBuffer.current.front() ?? timestamp;
    const currentFps = completeBufferRoutine(
      circularBuffer.current,
      timestamp,
      previousTimestamp,
      totalRenderTime
    );
    uiFps.value = currentFps;
  });

  const animatedProps = useAnimatedProps(() => {
    const text = uiFps.value ?? 'N/A';
    return { text, defaultValue: text };
  });

  return (
    <View style={styles.container}>
      <Text style={styles.headers}>UI FPS</Text>
      <AnimatedTextInput
        style={styles.text}
        animatedProps={animatedProps}
        editable={false}
      />
    </View>
  );
}

export function PerformanceMonitor() {
  return (
    <View style={styles.monitor}>
      <JsPerformance />
      <UiPerformance />
    </View>
  );
}

const styles = StyleSheet.create({
  monitor: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    padding: 8,
    position: 'absolute',
    backgroundColor: '#fffa',
    zIndex: 1000,
  },
  headers: {
    fontSize: 12,
  },
  text: {
    fontSize: 16,
  },
  container: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
