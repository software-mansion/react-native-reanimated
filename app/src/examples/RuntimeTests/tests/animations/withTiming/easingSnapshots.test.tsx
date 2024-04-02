import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  EasingFunction,
  EasingFunctionFactory,
} from 'react-native-reanimated';
import React from 'react';
import {
  describe,
  test,
  expect,
  mockAnimationTimer,
  recordAnimationUpdates,
  render,
  useTestRef,
  wait,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { Snapshots } from './withTiming.snapshot';

const AnimatedComponent = ({
  easing,
}: {
  easing: EasingFunction | EasingFunctionFactory | undefined;
}) => {
  const widthSV = useSharedValue(0);
  const ref = useTestRef('AnimatedComponent');

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(
        widthSV.value,
        easing ? { duration: 1000, easing } : { duration: 1000 }
      ),
    };
  });

  useEffect(() => {
    widthSV.value = 100;
  }, [widthSV]);

  return (
    <View style={styles.container}>
      <Animated.View ref={ref} style={[styles.animatedBox, style]} />
    </View>
  );
};
interface TestExample {
  easing: EasingFunction | EasingFunctionFactory | undefined;
  message: string;
  snapshotName: keyof typeof Snapshots;
}

describe('withTiming snapshots 📸, test EASING', () => {
  (
    [
      {
        easing: undefined,
        message: 'no easing function',
        snapshotName: 'noEasing',
      },

      ...(
        [
          ['back', [[0], [4.75]]],
          [
            'bezier',
            [
              [0.25, 0.1, 0.25, 1],
              [0.93, 2, 0.08, -0.96],
            ],
          ],
          ['elastic', [[0], [10]]],
          ['poly', [[1.5], [10], [5.5], [4]]],
          [
            'steps',
            [
              [7, true],
              [1.5, true],
              [1.5, false],
            ],
          ],
        ] as const
      ).flatMap(([easingName, argArray]) => {
        return argArray.map((args, idx) => {
          return {
            // @ts-ignore this code throws an error, some Easing function don't accept multiple arguments
            easing: Easing[easingName](...args),
            message: `Easing.${easingName}(${args.join(',')})`,
            snapshotName: `${easingName}${idx}` as keyof typeof Snapshots,
          };
        });
      }),

      // Easing functions without any parameters
      ...(
        [
          'bounce',
          'circle',
          'cubic',
          'ease',
          'exp',
          'linear',
          'quad',
          'sin',
        ] as const
      ).map((easingName) => {
        return {
          easing: Easing[easingName],
          message: `Easing.${easingName}`,
          snapshotName: easingName,
        };
      }),
      {
        easing: Easing.in(Easing.elastic(10)),
        message: 'Easing.in(Easing.elastic(10))',
        snapshotName: 'in',
      },
      {
        easing: Easing.inOut(Easing.elastic(10)),
        message: 'Easing.inOut(Easing.elastic(10))',
        snapshotName: 'inOut',
      },
      {
        easing: Easing.inOut(Easing.elastic(10)),
        message: 'Easing.inOut(Easing.elastic(10))',
        snapshotName: 'inOut',
      },
    ] as const
  ).forEach(({ easing, message, snapshotName }: TestExample) => {
    test(message, async () => {
      await mockAnimationTimer();
      const updatesContainer = await recordAnimationUpdates();
      await render(<AnimatedComponent easing={easing} />);
      await wait(1200);
      const updates = updatesContainer.getUpdates();
      expect(updates).toMatchSnapshots(Snapshots[snapshotName]);
      expect(updates).toMatchNativeSnapshots(
        await updatesContainer.getNativeSnapshots(),
        true
      );
    });
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    height: 80,
  },
});
