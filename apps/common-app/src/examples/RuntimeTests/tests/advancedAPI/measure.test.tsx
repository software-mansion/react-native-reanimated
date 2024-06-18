import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AnimatableValueObject, MeasuredDimensions } from 'react-native-reanimated';
import Animated, {
  runOnUI,
  measure,
  useAnimatedRef,
  useSharedValue,
  withDelay,
  withTiming,
  useAnimatedStyle,
  Easing,
  useFrameCallback,
} from 'react-native-reanimated';
import {
  describe,
  expect,
  test,
  render,
  wait,
  registerValue,
  getRegisteredValue,
} from '../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { ComparisonMode } from '../../ReanimatedRuntimeTestsRunner/types';

describe('Test measuring component before nad after animation', () => {
  const INITIAL_MEASURE = 'INITIAL_MEASURE';
  const FINAL_MEASURE = 'FINAL_MEASURE';
  const MeasuredComponent = ({
    initialStyle,
    finalStyle,
  }: {
    initialStyle: AnimatableValueObject;
    finalStyle: AnimatableValueObject;
  }) => {
    const measuredInitial = useSharedValue<MeasuredDimensions | null>(null);
    const measuredFinal = useSharedValue<MeasuredDimensions | null>(null);

    const styleSV = useSharedValue(initialStyle);

    registerValue(INITIAL_MEASURE, measuredInitial);
    registerValue(FINAL_MEASURE, measuredFinal);

    const ref = useAnimatedRef();

    const animatedStyle = useAnimatedStyle(() => {
      return styleSV.value;
    });

    useEffect(() => {
      runOnUI(() => {
        measuredInitial.value = measure(ref);
      })();
    });

    useEffect(() => {
      styleSV.value = withDelay(
        50,
        withTiming(finalStyle, { duration: 300 }, () => {
          measuredFinal.value = measure(ref);
        }),
      );
    });

    return (
      <View style={styles.container}>
        <Animated.View ref={ref} style={[styles.smallBox, animatedStyle]} />
      </View>
    );
  };

  test.each([
    [{ width: 40 }, { width: 100 }],
    [{ height: 40 }, { height: 100 }],
    [
      { height: 80, width: 20 },
      { height: 25, width: 85 },
    ],
    [{ margin: 40 }, { margin: 60 }],
    [
      { height: 40, width: 40, margin: 40 },
      { height: 100, width: 100, margin: 60 },
    ],
    [
      { height: 40, width: 40, margin: 40, top: 0 },
      { height: 100, width: 100, margin: 60, top: 40 },
    ],
    [
      { height: 40, width: 40, margin: 40, left: 0 },
      { height: 100, width: 100, margin: 60, left: 40 },
    ],
    [
      { height: 40, width: 40, margin: 40, left: 0, top: 50 },
      { height: 100, width: 100, margin: 60, left: 40, top: 0 },
    ],
  ])('Measure component animating from ${0} to ${1}', async ([initialStyle, finalStyle]) => {
    await render(<MeasuredComponent initialStyle={initialStyle} finalStyle={finalStyle} />);
    await wait(450);
    const measuredInitial = (await getRegisteredValue(INITIAL_MEASURE)).onJS as unknown as MeasuredDimensions;
    const measuredFinal = (await getRegisteredValue(FINAL_MEASURE)).onJS as unknown as MeasuredDimensions;

    // Check the distance from the top
    const finalStyleFull = { width: 100, height: 100, margin: 0, top: 0, left: 0, ...finalStyle };
    const initialStyleFull = { width: 100, height: 100, margin: 0, top: 0, left: 0, ...initialStyle };

    if ('height' in finalStyle && 'height' in initialStyle) {
      expect(measuredFinal.height).toBeWithinRange(finalStyle.height - 2, finalStyle.height + 2);
      expect(measuredInitial.height).toBeWithinRange(initialStyle.height - 2, initialStyle.height + 2);
    }

    if ('width' in finalStyle && 'width' in initialStyle) {
      expect(measuredFinal.width).toBeWithinRange(finalStyle.width - 2, finalStyle.width + 2);
      expect(measuredInitial.width).toBeWithinRange(initialStyle.width - 2, initialStyle.width + 2);
    }

    // Absolute translation equals relative translation
    expect(measuredFinal.pageX - measuredInitial.pageX).toBe(measuredFinal.x - measuredInitial.x);
    expect(measuredFinal.pageY - measuredInitial.pageY).toBe(measuredFinal.y - measuredInitial.y);

    // Check distance from top and from left
    const expectedInitialDistanceFromTop = initialStyleFull.margin + initialStyleFull.top;
    expect(measuredInitial.y).toBeWithinRange(expectedInitialDistanceFromTop - 2, expectedInitialDistanceFromTop + 2);
    const expectedFinalDistanceFromTop = finalStyleFull.margin + finalStyleFull.top;
    expect(measuredFinal.y).toBeWithinRange(expectedFinalDistanceFromTop - 2, expectedFinalDistanceFromTop + 2);

    const expectedInitialDistanceFromLeft = initialStyleFull.margin + initialStyleFull.left;
    expect(measuredInitial.x).toBeWithinRange(expectedInitialDistanceFromLeft - 2, expectedInitialDistanceFromLeft + 2);
    const expectedFinalDistanceFromLeft = finalStyleFull.margin + finalStyleFull.left;
    expect(measuredFinal.x).toBeWithinRange(expectedFinalDistanceFromLeft - 2, expectedFinalDistanceFromLeft + 2);
  });
});

describe('Test measuring component during the animation', () => {
  const DURATION = 500;
  const FINAL_WIDTH = 300;
  const OBSERVED_WIDTHS_REF = 'OBSERVED_WIDTHS_REF';
  const TestComponent = () => {
    const width = useSharedValue(0);
    const observedWidths = useSharedValue<Array<[number, number]>>([]);
    registerValue(OBSERVED_WIDTHS_REF, observedWidths);
    const ref = useAnimatedRef();

    useFrameCallback(({ timeSinceFirstFrame, timeSincePreviousFrame }) => {
      if (timeSinceFirstFrame === 0) {
        width.value = withTiming(FINAL_WIDTH, { easing: Easing.linear, duration: DURATION });
      } else if (timeSinceFirstFrame !== timeSincePreviousFrame) {
        const observedWidth = measure(ref)?.width;
        observedWidths.value = [
          ...observedWidths.value,
          [observedWidth || 0, timeSinceFirstFrame - (timeSincePreviousFrame || 0)],
        ];
      }
    });

    const animatedStyle = useAnimatedStyle(() => {
      return { width: width.value };
    });

    return (
      <View style={styles.container}>
        <Animated.View ref={ref} style={[styles.smallBox, animatedStyle]} />
      </View>
    );
  };

  test('Test that measurements of withTiming match the expectations', async () => {
    await render(<TestComponent />);
    await wait(650);
    const observedWidths = (await getRegisteredValue(OBSERVED_WIDTHS_REF)).onJS as Array<[number, number]>;
    observedWidths.forEach(([width, timeSinceFirstFrame]) => {
      const expectedWidth = Math.min(FINAL_WIDTH, (timeSinceFirstFrame * FINAL_WIDTH) / DURATION);
      expect(width).toBe(expectedWidth, ComparisonMode.DISTANCE);
    });
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  smallBox: {
    width: 100,
    height: 50,
    backgroundColor: 'mediumseagreen',
    borderColor: 'seagreen',
    borderWidth: 2,
    borderRadius: 10,
  },
});
