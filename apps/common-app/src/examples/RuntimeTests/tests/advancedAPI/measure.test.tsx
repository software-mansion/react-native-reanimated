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

const DEFAULT_STYLE = {
  width: 100,
  height: 50,
  margin: 0,
  top: 0,
  left: 0,
};
const DEFAULT_PARENT_MARGIN = 50;

type TestCase = {
  initialStyle: AnimatableValueObject;
  finalStyle: AnimatableValueObject;
  initialParentMargin: number;
  finalParentMargin: number;
};

describe('Test measuring component before nad after animation of the component and its parent', () => {
  const INITIAL_MEASURE = 'INITIAL_MEASURE';
  const FINAL_MEASURE = 'FINAL_MEASURE';
  const MeasuredComponent = ({ initialStyle, finalStyle, initialParentMargin, finalParentMargin }: TestCase) => {
    const measuredInitial = useSharedValue<MeasuredDimensions | null>(null);
    const measuredFinal = useSharedValue<MeasuredDimensions | null>(null);

    const styleSV = useSharedValue(initialStyle);
    const parentMarginSV = useSharedValue(initialParentMargin);

    registerValue(INITIAL_MEASURE, measuredInitial);
    registerValue(FINAL_MEASURE, measuredFinal);

    const ref = useAnimatedRef();

    const animatedStyle = useAnimatedStyle(() => {
      return styleSV.value;
    });

    const parentMargin = useAnimatedStyle(() => {
      return { margin: parentMarginSV.value };
    });

    useEffect(() => {
      setTimeout(() => {
        runOnUI(() => {
          measuredInitial.value = measure(ref);
        })();
      }, 50);
    });

    useEffect(() => {
      styleSV.value = withDelay(
        400,
        withTiming(finalStyle, { duration: 300 }, () => {
          measuredFinal.value = measure(ref);
        }),
      );
      parentMarginSV.value = withDelay(
        400,
        withTiming(finalParentMargin, { duration: 200 }, () => {}),
      );
    });

    return (
      <Animated.View style={[styles.container, parentMargin]}>
        <Animated.View ref={ref} style={[styles.smallBox, animatedStyle]} />
      </Animated.View>
    );
  };

  test.each([
    { initialStyle: { width: 40 }, finalStyle: { width: 100 }, initialParentMargin: 30, finalParentMargin: 60 },
    { initialStyle: { height: 40 }, finalStyle: { height: 100 }, initialParentMargin: 30, finalParentMargin: 60 },
    { initialStyle: { margin: 40 }, finalStyle: { margin: 60 }, initialParentMargin: 30, finalParentMargin: 60 },
    {
      initialStyle: { height: 80, width: 20 },
      finalStyle: { height: 25, width: 85 },
      initialParentMargin: 30,
      finalParentMargin: 60,
    },
    {
      initialStyle: { height: 40, width: 40, margin: 40 },
      finalStyle: { height: 100, width: 100, margin: 60 },
      initialParentMargin: 0,
      finalParentMargin: 100,
    },
    {
      initialStyle: { height: 40, width: 40, margin: 40, top: 0 },
      finalStyle: { height: 100, width: 100, margin: 60, top: 40 },
      initialParentMargin: 30,
      finalParentMargin: 30,
    },
    {
      initialStyle: { height: 40, width: 40, margin: 40, left: 0 },
      finalStyle: { height: 100, width: 100, margin: 60, left: 40 },
      initialParentMargin: 0,
      finalParentMargin: 0,
    },
    {
      initialStyle: { height: 40, width: 40, margin: 40, left: 0, top: 50 },
      finalStyle: { height: 100, width: 100, margin: 60, left: 40, top: 0 },
      initialParentMargin: 100,
      finalParentMargin: 60,
    },
  ] as Array<TestCase>)(
    'Measure test *****%#*****',
    async ({ initialStyle, finalStyle, initialParentMargin, finalParentMargin }) => {
      await render(
        <MeasuredComponent
          initialStyle={initialStyle}
          finalStyle={finalStyle}
          initialParentMargin={initialParentMargin}
          finalParentMargin={finalParentMargin}
        />,
      );

      await wait(1000);

      const measuredInitial = (await getRegisteredValue(INITIAL_MEASURE)).onJS as unknown as MeasuredDimensions;
      const measuredFinal = (await getRegisteredValue(FINAL_MEASURE)).onJS as unknown as MeasuredDimensions;

      // Check the distance from the top
      const finalStyleFull = { ...DEFAULT_STYLE, ...finalStyle };
      const initialStyleFull = { ...DEFAULT_STYLE, ...initialStyle };

      expect(measuredFinal.height).toBeWithinRange(finalStyleFull.height - 2, finalStyleFull.height + 2);
      expect(measuredInitial.height).toBeWithinRange(initialStyleFull.height - 2, initialStyleFull.height + 2);
      expect(measuredFinal.width).toBeWithinRange(finalStyleFull.width - 2, finalStyleFull.width + 2);
      expect(measuredInitial.width).toBeWithinRange(initialStyleFull.width - 2, initialStyleFull.width + 2);

      const expectedFinalDistanceFromLeft = finalStyleFull.margin + finalStyleFull.left;
      const expectedInitialDistanceFromLeft = initialStyleFull.margin + initialStyleFull.left;

      expect(measuredFinal.x).toBeWithinRange(expectedFinalDistanceFromLeft - 3, expectedFinalDistanceFromLeft + 3);
      expect(measuredInitial.x).toBeWithinRange(
        expectedInitialDistanceFromLeft - 3,
        expectedInitialDistanceFromLeft + 3,
      );

      expect(measuredFinal.pageX).toBeWithinRange(
        expectedFinalDistanceFromLeft + finalParentMargin - 3,
        expectedFinalDistanceFromLeft + finalParentMargin + 3,
      );
      expect(measuredInitial.pageX).toBeWithinRange(
        expectedInitialDistanceFromLeft + initialParentMargin - 3,
        expectedInitialDistanceFromLeft + initialParentMargin + 3,
      );

      // Unfortunately we can't directly verify the distance from the top - it relies on top bar width
      // Therefore we will check that the differences between initial and final values are valid
      // And the differences between absolute and relative views -as well
      const expectedTopDiffRelative =
        finalStyleFull.top + finalStyleFull.margin - initialStyleFull.top - initialStyleFull.margin;
      const expectedTopDiffAbsolute = expectedTopDiffRelative + finalParentMargin - initialParentMargin;

      expect(measuredFinal.y - measuredInitial.y).toBeWithinRange(
        expectedTopDiffRelative - 2,
        expectedTopDiffRelative + 2,
      );

      expect(measuredFinal.pageY - measuredInitial.pageY).toBeWithinRange(
        expectedTopDiffAbsolute - 2,
        expectedTopDiffAbsolute + 2,
      );
    },
  );
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
    margin: DEFAULT_PARENT_MARGIN,
    borderColor: 'darkseagreen',
    borderWidth: 2,
    borderRadius: 10,
  },
  smallBox: {
    ...DEFAULT_STYLE,
    backgroundColor: 'mediumseagreen',
    borderColor: 'seagreen',
    borderWidth: 2,
    borderRadius: 10,
  },
});
