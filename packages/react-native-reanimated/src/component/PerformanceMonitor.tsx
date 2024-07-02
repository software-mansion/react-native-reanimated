'use strict';

import React, { useEffect, useRef } from 'react';
import { TextInput, StyleSheet, View } from 'react-native';

import type { FrameInfo } from '../frameCallback';
import { useSharedValue, useAnimatedProps, useFrameCallback } from '../hook';
import { createAnimatedComponent } from '../createAnimatedComponent';
import { addWhitelistedNativeProps } from '../ConfigHelper';

class CircularAccumulator {
  private mainAccumulator: number = 0;
  private memoryAccumulator: number = 0;

  private iterator: number = 0;
  private circularArray: Float32Array;

  // fixme: may be negatively influenced by the first empty run
  // definietely a flawed system, remove or find a different error source
  private errorRateAccumulator: number = 0;

  length: number;
  previousTimestamp: number = 0;

  constructor(length: number) {
    this.length = length;
    this.circularArray = new Float32Array(length);
  }

  private arrayEndHandler() {
    this.errorRateAccumulator += this.memoryAccumulator;
    this.memoryAccumulator = this.mainAccumulator;
    this.mainAccumulator = 0;
    this.iterator = 0;
  }

  pushTimeDelta(timeDelta: number) {
    if (this.iterator === this.length) {
      this.arrayEndHandler();
    }

    this.mainAccumulator += timeDelta;
    this.memoryAccumulator -= this.circularArray[this.iterator];
    this.circularArray[this.iterator] = timeDelta;

    this.iterator += 1;
  }

  pushTimestamp(time: number) {
    const timeDifference = time - this.previousTimestamp;
    this.previousTimestamp = time;
    this.pushTimeDelta(timeDifference);
  }

  getCurrentFramerate() {
    const averageRenderTime =
      (this.mainAccumulator + this.memoryAccumulator) / this.length;
    return 1000 / averageRenderTime;
  }

  getErrorRate() {
    return this.errorRateAccumulator;
  }
}

const DEFAULT_BUFFER_SIZE = 20;

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

function JsPerformance() {
  const jsFps = useSharedValue<string | null>(null);
  const circularAccumulator = useRef<CircularAccumulator>(
    new CircularAccumulator(DEFAULT_BUFFER_SIZE)
  );

  useEffect(() => {
    loopAnimationFrame((_, timestamp) => {
      timestamp = Math.round(timestamp);

      circularAccumulator.current.pushTimestamp(timestamp);

      jsFps.value = circularAccumulator.current
        .getCurrentFramerate()
        .toFixed(0);
    });
  }, [jsFps]);

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
  const circularAccumulator = useSharedValue<CircularAccumulator | null>(null);

  useFrameCallback(({ timeSincePreviousFrame }: FrameInfo) => {
    'worklet';
    if (circularAccumulator.value === null) {
      circularAccumulator.value = new CircularAccumulator(DEFAULT_BUFFER_SIZE);
    }
    if (!timeSincePreviousFrame) {
      return;
    }

    timeSincePreviousFrame = Math.round(timeSincePreviousFrame);
    circularAccumulator.value.pushTimeDelta(timeSincePreviousFrame);

    const currentFps = circularAccumulator.value.getCurrentFramerate();

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
