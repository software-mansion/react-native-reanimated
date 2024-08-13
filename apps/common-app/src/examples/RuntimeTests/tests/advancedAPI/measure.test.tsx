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
import { describe, expect, test, render, wait, registerValue, getRegisteredValue } from '../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../ReJest/types';

const INITIAL_STYLE = {
  width: 100,
  height: 50,
  margin: 0,
  top: 0,
  left: 0,
};
const PARENT_MARGIN = 50;

describe.only('Test measuring component before nad after animation', () => {
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
      setTimeout(() => {
        runOnUI(() => {
          measuredInitial.value = measure(ref);
        })();
      }, 200);
    });

    useEffect(() => {
      styleSV.value = withDelay(
        250,
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
    await wait(700);
    const measuredInitial = (await getRegisteredValue(INITIAL_MEASURE)).onJS as unknown as MeasuredDimensions;
    const measuredFinal = (await getRegisteredValue(FINAL_MEASURE)).onJS as unknown as MeasuredDimensions;

    // Check the distance from the top
    const finalStyleFull = { ...INITIAL_STYLE, ...finalStyle };
    const initialStyleFull = { ...INITIAL_STYLE, ...initialStyle };

    expect(measuredFinal.height).toBeWithinRange(finalStyleFull.height - 2, finalStyleFull.height + 2);
    expect(measuredInitial.height).toBeWithinRange(initialStyleFull.height - 2, initialStyleFull.height + 2);
    expect(measuredFinal.width).toBeWithinRange(finalStyleFull.width - 2, finalStyleFull.width + 2);
    expect(measuredInitial.width).toBeWithinRange(initialStyleFull.width - 2, initialStyleFull.width + 2);

    const expectedFinalDistanceFromLeft = finalStyleFull.margin + finalStyleFull.left;
    const expectedInitialDistanceFromLeft = initialStyleFull.margin + initialStyleFull.left;

    expect(measuredFinal.x).toBeWithinRange(expectedFinalDistanceFromLeft - 2, expectedFinalDistanceFromLeft + 2);
    expect(measuredInitial.x).toBeWithinRange(expectedInitialDistanceFromLeft - 2, expectedInitialDistanceFromLeft + 2);

    expect(measuredFinal.pageX).toBeWithinRange(
      expectedFinalDistanceFromLeft + PARENT_MARGIN - 2,
      expectedFinalDistanceFromLeft + PARENT_MARGIN + 2,
    );
    expect(measuredInitial.pageX).toBeWithinRange(
      expectedInitialDistanceFromLeft + PARENT_MARGIN - 2,
      expectedInitialDistanceFromLeft + PARENT_MARGIN + 2,
    );

    // Unfortunately we can't directly verify the distance from the top - it relies on top bar width
    // Therefore we will check that the differences between initial and final values are valid
    // And the differences between absolute and relative views -as well
    const expectedTopDiff = finalStyleFull.top + finalStyleFull.margin - initialStyleFull.top - initialStyleFull.margin;
    expect(measuredFinal.y - measuredInitial.y).toBeWithinRange(expectedTopDiff - 2, expectedTopDiff + 2);
    expect(measuredFinal.pageY - measuredInitial.pageY).toBeWithinRange(expectedTopDiff - 2, expectedTopDiff + 2);
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
      expect(width).toBe(expectedWidth, ComparisonMode.PIXEL);
    });
  });
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    margin: PARENT_MARGIN,
    backgroundColor: 'lightblue',
  },
  smallBox: {
    ...INITIAL_STYLE,
    backgroundColor: 'mediumseagreen',
    borderColor: 'seagreen',
    borderWidth: 2,
    borderRadius: 10,
  },
});
