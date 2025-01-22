import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';
import {
  describe,
  test,
  expect,
  render,
  getTestComponent,
  wait,
  useTestRef,
  registerValue,
  getRegisteredValue,
} from '../../ReJest/RuntimeTestsApi';

const ELAPSED_TIME_REF = 'ElapsedTime';

describe('Test *****cancelAnimation*****', () => {
  describe('Test canceling animation _after predefined time_', () => {
    const CANCEL_AFTER_DELAY_REF = 'CancelAfterDelayComponent';
    const CancelAfterDelayComponent = ({
      animationDuration,
      timeToStop,
    }: {
      animationDuration: number;
      timeToStop: number;
    }) => {
      const width = useSharedValue(0);
      const elapsedTime = useSharedValue(0);
      registerValue(ELAPSED_TIME_REF, elapsedTime);
      const ref = useTestRef(CANCEL_AFTER_DELAY_REF);

      const animatedStyle = useAnimatedStyle(() => {
        return {
          width: width.value,
        };
      });

      useEffect(() => {
        const startTime = performance.now();
        width.value = withTiming(300, { duration: animationDuration, easing: Easing.linear }, () => {
          const stopTime = performance.now();
          elapsedTime.value = stopTime - startTime;
        });

        setTimeout(() => {
          cancelAnimation(width);
        }, timeToStop);
      }, [width, timeToStop, animationDuration, elapsedTime]);

      return (
        <View style={styles.container}>
          <Animated.View ref={ref} style={[styles.animatedBox, animatedStyle]} />
        </View>
      );
    };
    test.each([
      [400, 450],
      [500, 200],
      [1000, 200],
      [1000, 400],
      [10000, 400],
      [2000, 300],
    ])('Stop after **${1}**ms, full animation is **${0}**ms long ', async ([animationDuration, timeToStop]) => {
      await render(<CancelAfterDelayComponent animationDuration={animationDuration} timeToStop={timeToStop} />);
      const animatedComponent = getTestComponent(CANCEL_AFTER_DELAY_REF);

      await wait(timeToStop + 200);

      const timeElapsed = (await getRegisteredValue(ELAPSED_TIME_REF)).onJS as number;
      const expectedWidth = 300 * (timeElapsed / animationDuration);
      expect(await animatedComponent.getAnimatedStyle('width')).toBeWithinRange(expectedWidth - 4, expectedWidth + 4);
    });
  });

  describe('Test canceling animation _after fulfilling condition_ of reaching a predefined value', () => {
    const CANCEL_AFTER_CONDITION_REF = 'CancelAfterDelayComponent';

    const CancelAfterConditionComponent = ({ stopValue }: { stopValue: number }) => {
      const width = useSharedValue(0);
      const ref = useTestRef(CANCEL_AFTER_CONDITION_REF);

      const animatedStyle = useAnimatedStyle(() => {
        return {
          width: width.value,
        };
      });
      useDerivedValue(() => {
        if (width.value >= stopValue) {
          cancelAnimation(width);
        }
      });

      useEffect(() => {
        width.value = withTiming(300, { duration: 300, easing: Easing.linear });
      });

      return (
        <View style={styles.container}>
          <Animated.View ref={ref} style={[styles.animatedBox, animatedStyle]} />
        </View>
      );
    };

    test.each([100, 150, 200, 300])('Stop after width equals **%p**', async stopValue => {
      await render(<CancelAfterConditionComponent stopValue={stopValue} />);
      const animatedComponent = getTestComponent(CANCEL_AFTER_CONDITION_REF);

      await wait(320);

      expect(await animatedComponent.getAnimatedStyle('width')).toBeWithinRange(stopValue, stopValue + 17);
    });
  });

  describe('Test canceling animation _from callback_ after finishing other animation', () => {
    const CANCEL_FROM_CALLBACK_REF = 'CancelAfterDelayComponent';

    const CancelFromCallbackComponent = ({
      animationDuration,
      timeToStop,
    }: {
      animationDuration: number;
      timeToStop: number;
    }) => {
      const width1 = useSharedValue(0);
      const width2 = useSharedValue(0);

      const ref = useTestRef(CANCEL_FROM_CALLBACK_REF);

      const animatedStyle1 = useAnimatedStyle(() => {
        return {
          width: width1.value,
        };
      });
      const animatedStyle2 = useAnimatedStyle(() => {
        return {
          width: width2.value,
        };
      });

      useEffect(() => {
        width1.value = withTiming(300, { duration: animationDuration, easing: Easing.linear });
        width2.value = withTiming(300, { duration: timeToStop, easing: Easing.linear }, () => {
          cancelAnimation(width1);
        });
      });

      return (
        <View style={styles.container}>
          <Animated.View ref={ref} style={[styles.animatedBox, animatedStyle1]} />
          <Animated.View style={[styles.animatedBox, animatedStyle2]} />
        </View>
      );
    };

    test.each([
      [300, 1000],
      [30, 1000],
    ])('Stop after width equals **%p**', async ([timeToStop, animationDuration]) => {
      await render(<CancelFromCallbackComponent animationDuration={animationDuration} timeToStop={timeToStop} />);
      const animatedComponent = getTestComponent(CANCEL_FROM_CALLBACK_REF);

      await wait(timeToStop + 100);
      const expectedWidth = (timeToStop / animationDuration) * 300;

      expect(await animatedComponent.getAnimatedStyle('width')).toBeWithinRange(expectedWidth, expectedWidth + 5);
    });
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    backgroundColor: 'seagreen',
    height: 80,
    margin: 30,
  },
});
