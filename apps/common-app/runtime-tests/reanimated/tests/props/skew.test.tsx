import React, { useEffect } from 'react';
import type { MeasuredDimensions } from 'react-native-reanimated';
import Animated, {
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getSharedValue,
  registerValue,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

type SkewMode = 'static' | 'worklet' | 'css' | 'compound';

function SkewProbe({ mode }: { mode: SkewMode }) {
  const actualRef = useAnimatedRef();
  const expectedRef = useAnimatedRef();
  const actual = useSharedValue<MeasuredDimensions | null>(null);
  const expected = useSharedValue<MeasuredDimensions | null>(null);
  registerValue('skewActual', actual);
  registerValue('skewExpected', expected);
  const angle = useSharedValue(0);
  useEffect(() => {
    angle.value = 30;
  }, [angle]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: `skew(${angle.value}deg, ${angle.value / 2}deg)`,
  }));
  useFrameCallback(() => {
    actual.value = measure(actualRef);
    expected.value = measure(expectedRef);
  });

  const box = {
    position: 'absolute' as const,
    width: 100,
    height: 80,
    left: 80,
    top: 100,
    transformOrigin: '0 0',
  };
  // A single matrix is accepted by RN and is an independent geometry oracle.
  const matrix = [
    1,
    Math.tan(Math.PI / 12),
    0,
    0,
    Math.tan(Math.PI / 6),
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    mode === 'compound' ? 25 : 0,
    0,
    0,
    1,
  ];
  return (
    <>
      <Animated.View
        ref={expectedRef}
        style={[box, { transform: [{ matrix }] }]}
      />
      <Animated.View
        ref={actualRef}
        style={[
          box,
          mode === 'worklet'
            ? animatedStyle
            : {
                transform:
                  mode === 'css'
                    ? 'skew(0)'
                    : `${mode === 'compound' ? 'translateX(25%) ' : ''}skew(30deg, 15deg)`,
              },
          mode === 'css'
            ? {
                animationName: {
                  from: { transform: 'skew(0)' },
                  to: { transform: 'skew(60deg, 30deg)' },
                },
                animationDuration: 1000,
                animationDelay: -500,
                animationTimingFunction: 'linear',
                animationPlayState: 'paused',
                animationFillMode: 'both',
              }
            : {},
        ]}
      />
    </>
  );
}

describe('Combined CSS skew', () => {
  test.each<{ mode: SkewMode }>([
    { mode: 'static' },
    { mode: 'worklet' },
    { mode: 'css' },
    { mode: 'compound' },
  ])('renders ${mode} skew with CSS geometry', async ({ mode }) => {
    await render(<SkewProbe mode={mode} />);
    await wait(500);
    const actual = (
      await getSharedValue<MeasuredDimensions | null>('skewActual')
    ).onUI;
    const expected = (
      await getSharedValue<MeasuredDimensions | null>('skewExpected')
    ).onUI;
    expect(actual === null).toBe(false);
    expect(expected === null).toBe(false);
    if (actual && expected) {
      // Ensure the measurement includes transforms, so equality cannot pass
      // just because both views have the same untransformed layout.
      expect(expected.width > 140).toBe(true);
      for (const key of ['pageX', 'pageY', 'width', 'height'] as const) {
        expect(actual[key]).toBe(expected[key], ComparisonMode.PIXEL);
      }
    }
  });
});
