import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { ComparisonMode } from '../../../ReanimatedRuntimeTestsRunner/types';
import {
  describe,
  test,
  expect,
  render,
  useTestRef,
  getTestComponent,
  wait,
  recordAnimationUpdates,
  mockAnimationTimer,
  unmockAnimationTimer,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { BasicSnapshots } from './useDerivedValue.snapshot';

const WIDTH_COMPONENT = 'WidthComponent';

describe('Test useDerivedValue changing width', () => {
  enum AnimationLocation {
    NONE = 'no animation',
    USE_EFFECT = 'animation inside useEffect',
    ANIMATED_STYLE = 'animation inside useAnimatedStyle',
  }

  enum AnimationType {
    NONE = '',
    TIMING = 'timing',
    SPRING = 'spring',
  }

  const WidthComponent = ({
    startWidth,
    finalWidth,
    animate,
    animationType,
    deriveFunction,
  }: {
    startWidth: number;
    finalWidth: number;
    animate: AnimationLocation;
    animationType: AnimationType;
    deriveFunction: (a: number) => number;
  }) => {
    const basicValue = useSharedValue(startWidth);
    const componentRef = useTestRef(WIDTH_COMPONENT);
    const derivedValue = useDerivedValue(() => {
      return deriveFunction(basicValue.value);
    });

    const derivedValueStyle = useAnimatedStyle(() => {
      if (animate === AnimationLocation.ANIMATED_STYLE) {
        return {
          width:
            animationType === AnimationType.TIMING ? withTiming(derivedValue.value) : withSpring(derivedValue.value),
        };
      } else {
        return { width: derivedValue.value };
      }
    });

    useEffect(() => {
      if (animate === AnimationLocation.USE_EFFECT) {
        basicValue.value = animationType === AnimationType.TIMING ? withTiming(finalWidth) : withSpring(finalWidth);
      } else {
        basicValue.value = finalWidth;
      }
    }, [basicValue, finalWidth, animate, animationType]);

    return (
      <View style={styles.container}>
        <Animated.View ref={componentRef} style={[styles.animatedBox, derivedValueStyle]} />
      </View>
    );
  };

  [
    {
      derivedFun: (x: number) => {
        'worklet';
        return 2 * x + 20;
      },
      msg: 'x => 2 * x + 20',
      index: 0,
    },

    {
      derivedFun: (x: number) => {
        'worklet';
        return 100 + Math.sin(x) * 80;
      },
      msg: 'x => 100 + 80sin(x)',
      index: 1,
    },
  ].forEach(({ derivedFun, msg, index }) => {
    describe(`Tests for derived function ${msg}`, () => {
      async function getSnapshotUpdatesAndCheckFinalValue(
        startWidth: number,
        finalWidth: number,
        animate: AnimationLocation,
        animationType: AnimationType,
      ) {
        await mockAnimationTimer();
        const updatesContainerActive = await recordAnimationUpdates();
        await render(
          <WidthComponent
            startWidth={startWidth}
            finalWidth={finalWidth}
            animate={animate}
            animationType={animationType}
            deriveFunction={derivedFun}
          />,
        );
        const testComponent = getTestComponent(WIDTH_COMPONENT);
        const waitTime =
          animationType === AnimationType.NONE ? 50 : animationType === AnimationType.TIMING ? 350 : 1800;
        await wait(waitTime);
        expect(await testComponent.getAnimatedStyle('width')).toBe(derivedFun(finalWidth), ComparisonMode.DISTANCE);
        const updates = updatesContainerActive.getUpdates();
        const naiveUpdates = await updatesContainerActive.getNativeSnapshots();
        await unmockAnimationTimer();
        return [updates, naiveUpdates];
      }

      test.each([
        {
          startWidth: 0,
          finalWidth: 100,
          animate: AnimationLocation.USE_EFFECT,
          animationType: AnimationType.TIMING,
        },
        {
          startWidth: 0,
          finalWidth: 100,
          animate: AnimationLocation.ANIMATED_STYLE,
          animationType: AnimationType.TIMING,
        },
        {
          startWidth: 0,
          finalWidth: 100,
          animate: AnimationLocation.ANIMATED_STYLE,
          animationType: AnimationType.SPRING,
        },
        {
          startWidth: 0,
          finalWidth: 100,
          animate: AnimationLocation.USE_EFFECT,
          animationType: AnimationType.SPRING,
        },
        {
          startWidth: 0,
          finalWidth: 100,
          animate: AnimationLocation.NONE,
          animationType: AnimationType.NONE,
        },
        {
          startWidth: 100,
          finalWidth: 20,
          animate: AnimationLocation.USE_EFFECT,
          animationType: AnimationType.TIMING,
        },
        {
          startWidth: 400,
          finalWidth: 300,
          animate: AnimationLocation.ANIMATED_STYLE,
          animationType: AnimationType.TIMING,
        },
        {
          startWidth: 20,
          finalWidth: 100,
          animate: AnimationLocation.ANIMATED_STYLE,
          animationType: AnimationType.SPRING,
        },
        {
          startWidth: 55.5,
          finalWidth: 155.5,
          animate: AnimationLocation.USE_EFFECT,
          animationType: AnimationType.SPRING,
        },
        {
          startWidth: 300,
          finalWidth: 33,
          animate: AnimationLocation.NONE,
          animationType: AnimationType.NONE,
        },
      ])(
        'Animate from ${startWidth} to ${finalWidth}, ${animationType} ${animate}',
        async ({ startWidth, finalWidth, animate, animationType }) => {
          const snapshotIdPerType = {
            [AnimationLocation.NONE]: 1,
            [AnimationLocation.USE_EFFECT]: 2,
            [AnimationLocation.ANIMATED_STYLE]: 3,
          };

          const snapshotName =
            `width_${animationType}_${snapshotIdPerType[animate]}_${startWidth}_${finalWidth}`.replace(/\./g, '$');

          const [updates, nativeUpdates] = await getSnapshotUpdatesAndCheckFinalValue(
            startWidth,
            finalWidth,
            animate,
            animationType,
          );

          const snapshot = BasicSnapshots[`func_${index}` as keyof typeof BasicSnapshots];
          expect(updates).toMatchSnapshots(snapshot[snapshotName as keyof typeof snapshot]);
          expect(updates).toMatchNativeSnapshots(nativeUpdates, true);
        },
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
    width: 0,
    height: 80,
    margin: 30,
    backgroundColor: 'teal',
  },
});
