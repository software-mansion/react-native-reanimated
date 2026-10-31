import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  describe,
  expect,
  notify,
  recordAnimationUpdates,
  render,
  test,
  waitForNotification,
} from '../../../../ReJest/RuntimeTestsApi';

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const ZERO_SCALE = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const PERSPECTIVE = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -0.002, 0, 0, 0, 1];

function MatrixAnimation({
  from,
  to,
  spring,
  onFinish,
}: {
  from: number[];
  to: number[];
  spring: boolean;
  onFinish: (finished: boolean) => void;
}) {
  const matrix = useSharedValue(from);
  const style = useAnimatedStyle(() => ({
    transform: [{ matrix: matrix.value }],
  }));
  useEffect(() => {
    const callback = (finished?: boolean) => {
      'worklet';
      scheduleOnRN(onFinish, finished === true);
    };
    matrix.value = spring
      ? withSpring(to, { reduceMotion: ReduceMotion.Never }, callback)
      : withTiming(
          to,
          {
            duration: 300,
            easing: Easing.linear,
            reduceMotion: ReduceMotion.Never,
          },
          callback
        );
  }, [matrix, to, spring, onFinish]);
  return <Animated.View style={[styles.box, style]} />;
}

for (const spring of [false, true]) {
  describe(`${spring ? 'withSpring' : 'withTiming'} matrix interpolation`, () => {
    test.each([
      {
        name: 'mixed transform 0',
        from: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        to: [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2],
      },
      {
        name: 'mixed transform 1',
        from: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        to: [1, 1, 1, 1, 0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2],
      },
      {
        name: 'mixed transform 2',
        from: [1, 0, 0, 0, 0, 1, 0.5, 0, 0.5, 0, 1, 0, 0, 0, 0.5, 1],
        to: [1, 1, 1, 1, 0, 2, 0, 0, 0, 0, 10, 0, 0, 0, 0, 2],
      },
      {
        name: 'mixed transform 3',
        from: [10, 10, 10, 10, 0, 1, 0.5, 0, 0.5, 0, 1, 0, 0, 0, 0.5, 1],
        to: [1, 1, 1, 1, 0, 2, 0, 0.5, 30, 0, 10, 0, 0, 0, 0, 2],
      },
      {
        name: 'mixed transform 4',
        from: [-10, -20, -10, 10, 0, 1, 0.5, 0, 0.5, 0, 1, 60, 0, 0, 0.5, 1],
        to: [1, 1, 100, 1, 0, 2, 0, 0.5, 30, 0, 10, 0, 30, 0, 0, 2],
      },
      { name: 'collapse', from: IDENTITY, to: ZERO_SCALE },
      { name: 'expand', from: ZERO_SCALE, to: IDENTITY },
      { name: 'add perspective', from: IDENTITY, to: PERSPECTIVE },
      { name: 'remove perspective', from: PERSPECTIVE, to: IDENTITY },
    ])('${name}', async ({ from, to }) => {
      let didFinish = false;
      const onFinish = (finished: boolean) => {
        didFinish = finished;
        notify('matrix-finished');
      };
      const recorder = await recordAnimationUpdates();
      await render(
        <MatrixAnimation
          from={from}
          to={to}
          spring={spring}
          onFinish={onFinish}
        />
      );
      await waitForNotification('matrix-finished');
      expect(didFinish).toBe(true);
      const updates = await recorder.getUpdates();
      const matrices = updates.map(
        (update) =>
          (update as { transform: [{ matrix: number[] }] }).transform[0].matrix
      );
      expect(
        matrices[matrices.length - 1]?.every((value, i) => value === to[i])
      ).toBe(true);
      expect(matrices.length > 2).toBe(true);
      expect(matrices.every((matrix) => matrix.every(Number.isFinite))).toBe(
        true
      );
      const index = from[11] !== to[11] ? 11 : 0;
      expect(
        matrices.some(
          (matrix) =>
            matrix[index] !== from[index] && matrix[index] !== to[index]
        )
      ).toBe(true);
      if (from === PERSPECTIVE || to === PERSPECTIVE) {
        expect(
          matrices.some(
            (matrix) =>
              Math.abs(matrix[11]) > 0.0001 && Math.abs(matrix[11]) < 0.0019
          )
        ).toBe(true);
      }
    });
  });
}

const styles = StyleSheet.create({
  box: { width: 80, height: 80, margin: 80, backgroundColor: 'dodgerblue' },
});
