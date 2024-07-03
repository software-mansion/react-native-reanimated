'use strict';

import React, { useEffect, useRef } from 'react';
import { TextInput, StyleSheet, View } from 'react-native';

import type { FrameInfo } from '../frameCallback';
import { useSharedValue, useAnimatedProps, useFrameCallback } from '../hook';
import { createAnimatedComponent } from '../createAnimatedComponent';
import { addWhitelistedNativeProps } from '../ConfigHelper';

type CircularAccumulator = ReturnType<typeof contructCircularAccumulator>;
const contructCircularAccumulator = (length: number) => {
  'worklet';
  return {
    mainAccumulator: 0 as number,
    memoryAccumulator: 0 as number,
    errorRateAccumulator: 0 as number,

    iterator: 0 as number,
    circularArray: new Float32Array(length),
    length,

    previousTimestamp: 0 as number,

    arrayEndHandler() {
      this.errorRateAccumulator += this.memoryAccumulator;
      this.memoryAccumulator = this.mainAccumulator;
      this.mainAccumulator = 0;
      this.iterator = 0;
    },

    pushTimeDelta(timeDelta: number) {
      if (this.iterator >= this.length) {
        this.arrayEndHandler();
      }

      if (this.circularArray === null) {
        return;
      }

      this.mainAccumulator += timeDelta;
      this.memoryAccumulator -= this.circularArray[this.iterator];
      this.circularArray[this.iterator] = timeDelta;
      this.iterator += 1;
    },

    pushTimestamp(time: number) {
      const timeDifference =
        this.previousTimestamp !== 0 ? time - this.previousTimestamp : 0;
      this.previousTimestamp = time;
      this.pushTimeDelta(timeDifference);
    },

    getCurrentFramerate() {
      const averageRenderTime =
        (this.mainAccumulator + this.memoryAccumulator) / this.length;
      return 1000 / averageRenderTime;
    },

    getErrorRate() {
      return this.errorRateAccumulator;
    },
  };
};

const DEFAULT_BUFFER_SIZE = 20;

addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = createAnimatedComponent(TextInput);

function loopAnimationFrame(fn: (lastTime: number, time: number) => void) {
  let lastTime = 0;

  function loop() {
    'worklet';
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
    contructCircularAccumulator(DEFAULT_BUFFER_SIZE)
  );

  useEffect(() => {
    loopAnimationFrame((_, timestamp) => {
      'worklet';
      timestamp = Math.round(timestamp);

      circularAccumulator.current.pushTimestamp(timestamp);

      jsFps.value = // JS is sampled every 2nd frame, thus * 2
        (circularAccumulator.current.getCurrentFramerate() * 2).toFixed(0);
    });
  }, [jsFps]);

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const text = 'JS: ' + jsFps.value ?? 'N/A' + ' ';
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
      circularAccumulator.value =
        contructCircularAccumulator(DEFAULT_BUFFER_SIZE);
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
    'worklet';
    const text = 'UI: ' + uiFps.value ?? 'N/A' + ' ';
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
