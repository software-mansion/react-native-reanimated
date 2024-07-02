'use strict';

import React, { useEffect, useRef } from 'react';
import { TextInput, StyleSheet, View } from 'react-native';

import type { FrameInfo } from '../frameCallback';
import type { SharedValue } from '../commonTypes';
import { useSharedValue, useAnimatedProps, useFrameCallback } from '../hook';
import { createAnimatedComponent } from '../createAnimatedComponent';
import { addWhitelistedNativeProps } from '../ConfigHelper';

class PersistantAccumulator {
  // issue:
  // any issues which occured with CircularBuffer's frame summing, persisted over the entire runtime
  // these issues were frequent due to frequent frame drops
  // ---
  // solution:
  // remove persistency by quietly resetting the accumulator every X frames
  // ---
  // complete mechanism which avoids jumpiness:
  // go through buffer i=0 -> X, at X save acc to mem, set acc to 0.
  // framerate = (acc + mem) / 2*X
  // error rate can be measured by reading mem before overwriting it with acc.
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const pa = new PersistantAccumulator();

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

function getFps(renderTimeInMs: number): number {
  'worklet';
  return 1000 / renderTimeInMs;
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
): number {
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
  const circularBuffer = useRef<CircularBuffer>(
    createCircularDoublesBuffer(DEFAULT_BUFFER_SIZE)
  );

  useEffect(() => {
    loopAnimationFrame((_, timestamp) => {
      timestamp = Math.round(timestamp);
      const previousTimestamp = circularBuffer.current.front() ?? timestamp;

      const currentFps = completeBufferRoutine(
        circularBuffer.current,
        timestamp,
        previousTimestamp,
        totalRenderTime
      );

      // JS fps have to be measured every 2nd frame,
      // thus 2x multiplication has to occur here
      jsFps.value = (currentFps * 2).toFixed(0);
    });
  }, []);

  const animatedProps = useAnimatedProps(() => {
    const text = 'JS: ' + jsFps.value ?? 'N/A';
    return { text, defaultValue: text };
  });

  return (
    <View style={styles.container}>
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
  const circularBuffer = useSharedValue<CircularBuffer | null>(null);

  useFrameCallback(({ timestamp }: FrameInfo) => {
    if (circularBuffer.value === null) {
      circularBuffer.value = createCircularDoublesBuffer(DEFAULT_BUFFER_SIZE);
    }

    timestamp = Math.round(timestamp);
    const previousTimestamp = circularBuffer.value.front() ?? timestamp;

    const currentFps = completeBufferRoutine(
      circularBuffer.value,
      timestamp,
      previousTimestamp,
      totalRenderTime
    );

    uiFps.value = currentFps.toFixed(0);
  });

  const animatedProps = useAnimatedProps(() => {
    const text = 'UI: ' + uiFps.value ?? 'N/A';
    return { text, defaultValue: text };
  });

  return (
    <View style={styles.container}>
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
    position: 'absolute',
    backgroundColor: '#0006',
    zIndex: 1000,
  },
  header: {
    fontSize: 14,
    color: '#ffff',
    paddingHorizontal: 5,
  },
  text: {
    fontSize: 13,
    color: '#ffff',
    fontFamily: 'monospace',
    paddingHorizontal: 3,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
