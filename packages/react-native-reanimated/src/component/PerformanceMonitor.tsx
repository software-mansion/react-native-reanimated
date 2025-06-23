'use strict';

import { useEffect, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { createAnimatedComponent } from '../createAnimatedComponent';
import type { FrameInfo } from '../frameCallback';
import { useAnimatedProps, useFrameCallback, useSharedValue } from '../hook';

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

const DEFAULT_BUFFER_SIZE = 20;

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

function completeBufferRoutine(
  buffer: CircularBuffer,
  timestamp: number
): number {
  'worklet';
  timestamp = Math.round(timestamp);

  const droppedTimestamp = buffer.push(timestamp) ?? timestamp;

  const measuredRangeDuration = timestamp - droppedTimestamp;

  return getFps(measuredRangeDuration / buffer.count);
}

function JsPerformance({ smoothingFrames }: { smoothingFrames: number }) {
  const jsFps = useSharedValue<string | null>(null);
  const totalRenderTime = useSharedValue(0);
  const circularBuffer = useRef<CircularBuffer>(
    createCircularDoublesBuffer(smoothingFrames)
  );

  useEffect(() => {
    loopAnimationFrame((_, timestamp) => {
      timestamp = Math.round(timestamp);

      const currentFps = completeBufferRoutine(
        circularBuffer.current,
        timestamp
      );

      // JS fps have to be measured every 2nd frame,
      // thus 2x multiplication has to occur here
      jsFps.value = (currentFps * 2).toFixed(0);
    });
  }, [jsFps, totalRenderTime]);

  const animatedProps = useAnimatedProps(() => {
    const text = 'JS: ' + (jsFps.value ?? 'N/A') + ' ';
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

function UiPerformance({ smoothingFrames }: { smoothingFrames: number }) {
  const uiFps = useSharedValue<string | null>(null);
  const circularBuffer = useSharedValue<CircularBuffer | null>(null);

  useFrameCallback(({ timestamp }: FrameInfo) => {
    if (circularBuffer.value === null) {
      circularBuffer.value = createCircularDoublesBuffer(smoothingFrames);
    }

    timestamp = Math.round(timestamp);

    const currentFps = completeBufferRoutine(circularBuffer.value, timestamp);

    uiFps.value = currentFps.toFixed(0);
  });

  const animatedProps = useAnimatedProps(() => {
    const text = 'UI: ' + (uiFps.value ?? 'N/A') + ' ';
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

export type PerformanceMonitorProps = {
  /**
   * Sets amount of previous frames used for smoothing at highest expectedFps.
   *
   * Automatically scales down at lower frame rates.
   *
   * Affects jumpiness of the FPS measurements value.
   */
  smoothingFrames?: number;
};

/**
 * A component that lets you measure fps values on JS and UI threads on both the
 * Paper and Fabric architectures.
 *
 * @param smoothingFrames - Determines amount of saved frames which will be used
 *   for fps value smoothing.
 */
export function PerformanceMonitor({
  smoothingFrames = DEFAULT_BUFFER_SIZE,
}: PerformanceMonitorProps) {
  return (
    <View style={styles.monitor}>
      <JsPerformance smoothingFrames={smoothingFrames} />
      <UiPerformance smoothingFrames={smoothingFrames} />
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
    fontVariant: ['tabular-nums'],
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
