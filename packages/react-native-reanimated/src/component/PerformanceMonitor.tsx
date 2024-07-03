'use strict';

import React, { useEffect, useRef } from 'react';
import { TextInput, StyleSheet, View } from 'react-native';

import type { FrameInfo } from '../frameCallback';
import { useSharedValue, useAnimatedProps, useFrameCallback } from '../hook';
import { createAnimatedComponent } from '../createAnimatedComponent';
import { addWhitelistedNativeProps } from '../ConfigHelper';

type CircularAccumulator = ReturnType<typeof contructCircularAccumulator>;
const contructCircularAccumulator = (length: number, expectedFps: number) => {
  'worklet';
  return {
    mainAccumulator: 0 as number,
    memoryAccumulator: 0 as number,

    iterator: 0 as number,
    circularArray: new Float32Array(length),
    length,

    previousTimestamp: 0 as number,

    // divisions are expensive, use lookup tables for them
    frameWeightScalingTable: [] as { time: number; weight: number }[],
    frameWeightScalingLookupSteps: [] as number[],
    previousWeightScalingIndex: 0 as number, // optimalisation - previous weight most likely to be the current one as well.
    expectedFps,

    arrayEndHandler() {
      this.memoryAccumulator = this.mainAccumulator;
      this.mainAccumulator = 0;
      this.iterator = 0;
    },

    fillDynamicIterationWeights() {
      // issue: at 60fps, 20 smoothing, one complete buffer fill takes 0.33s
      //        at 10fps, 20 smoothing, one complete buffer fill takes 2s
      // solution: scale frame weight on smoothing linearly to how much it takes.
      //        at 60fps, 20 smoothing, 1 frame will set 1 element - 0.33s per fill
      //        at 10fps, 20 smoothing, 1 frame will set 6 elements - 0.33s per fill
      // fill lookup table from weights 1 to 'length'
      for (let weight = 1; weight < this.length; weight++) {
        const minActivationTime = (1000 / this.expectedFps) * weight;
        this.frameWeightScalingTable.push({ weight, time: minActivationTime });
      }

      for (
        let step = Math.floor(this.frameWeightScalingTable.length / 2);
        step > 1;
        step = Math.floor(step / 2)
      ) {
        this.frameWeightScalingLookupSteps.push(step);
      }
    },

    getDynamicIterationWeight(timeDelta: number) {
      // binary search - find fitting iteration weight
      if (this.frameWeightScalingTable.length === 0) {
        this.fillDynamicIterationWeights();
        return 1;
      }

      let bestWeightValue = this.frameWeightScalingTable[0].weight;
      let bestWeightMinTime = this.frameWeightScalingTable[0].time;
      let previousIndex = 0;
      let previousMinTime = bestWeightMinTime;
      for (let i = 0; i < this.frameWeightScalingLookupSteps.length; i++) {
        const step = this.frameWeightScalingLookupSteps[i];
        const checkedIndex =
          previousMinTime < timeDelta
            ? previousIndex + step
            : previousIndex - step;

        if (
          checkedIndex > this.frameWeightScalingTable.length ||
          checkedIndex < 0
        ) {
          break;
        }

        const currentWeightScalingObject =
          this.frameWeightScalingTable[checkedIndex];

        if (
          currentWeightScalingObject.time < timeDelta &&
          currentWeightScalingObject.weight > bestWeightValue
        ) {
          bestWeightValue = currentWeightScalingObject.weight;
          bestWeightMinTime = currentWeightScalingObject.time;
        }

        previousIndex = checkedIndex;
        previousMinTime = currentWeightScalingObject.time;
      }

      return bestWeightValue;
    },

    pushTimeDelta(timeDelta: number, repetitions?: number) {
      if (this.iterator >= this.length) {
        this.arrayEndHandler();
      }

      if (this.circularArray === null) {
        return;
      }

      if (repetitions === undefined) {
        repetitions = this.getDynamicIterationWeight(timeDelta);
      }

      this.mainAccumulator += timeDelta;
      this.memoryAccumulator -= this.circularArray[this.iterator];
      this.circularArray[this.iterator] = timeDelta;
      this.iterator += 1;

      if (repetitions > 1) {
        this.pushTimeDelta(timeDelta, repetitions - 1);
      }
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
  };
};

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

type PerformanceProps = {
  expectedFps: number;
  smoothingCoefficient: number;
};

function JsPerformance({
  expectedFps,
  smoothingCoefficient,
}: PerformanceProps) {
  const jsFps = useSharedValue<string | null>(null);
  const circularAccumulator = useRef<CircularAccumulator>(
    contructCircularAccumulator(smoothingCoefficient, expectedFps)
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

function UiPerformance({
  expectedFps,
  smoothingCoefficient,
}: PerformanceProps) {
  const uiFps = useSharedValue<string | null>(null);
  const circularAccumulator = useSharedValue<CircularAccumulator | null>(null);

  useFrameCallback(({ timeSincePreviousFrame }: FrameInfo) => {
    'worklet';
    if (circularAccumulator.value === null) {
      circularAccumulator.value = contructCircularAccumulator(
        smoothingCoefficient,
        expectedFps
      );
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

const DEFAULT_EXPECTED_FPS = 60;
const DEFAULT_BUFFER_SIZE = 20;

export type PerformanceMonitorProps = {
  /**
   * DEFAULT: 60
   *
   * Sets the highest expected fps value.
   *
   * Affects dynamic smoothing rate, but isn't critical to component's operation.
   */
  expectedFps?: number;

  /**
   * DEFAULT: 20
   *
   * Sets amount of previous frames used for smoothing at highest expectedFps.
   *
   * Automatically scales down at lower frame rates.
   *
   * Affects jumpiness of the FPS measurements value.
   */
  smoothingCoefficient?: number;
};
export function PerformanceMonitor({
  expectedFps,
  smoothingCoefficient,
}: PerformanceMonitorProps) {
  return (
    <View style={styles.monitor}>
      <JsPerformance
        expectedFps={expectedFps ?? DEFAULT_EXPECTED_FPS}
        smoothingCoefficient={smoothingCoefficient ?? DEFAULT_BUFFER_SIZE}
      />
      <UiPerformance
        expectedFps={expectedFps ?? DEFAULT_EXPECTED_FPS}
        smoothingCoefficient={smoothingCoefficient ?? DEFAULT_BUFFER_SIZE}
      />
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
