import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  callTracker,
  describe,
  expect,
  getRegisteredValue,
  getTrackerCallCount,
  mockAnimationTimer,
  recordAnimationUpdates,
  registerValue,
  render,
  test,
  waitForAnimationUpdates,
} from '../../../ReJest/RuntimeTestsApi';
import { Snapshots } from './snapshots.snapshot';

describe(`Cascade of callbacks`, () => {
  enum Tracker {
    callbackAnimation = 'callbackAnimation',
    interruptedAnimation = 'interruptedAnimationTracker',
    animationNotExecuted = 'animationNotExecuted',
  }
  enum SV {
    callbackArgument0 = 'callbackArgument0',
    callbackArgument1 = 'callbackArgument1',
  }
  const CallbackComponent = () => {
    const callbackArgument0 = useSharedValue<boolean | undefined | null>(null);
    const callbackArgument1 = useSharedValue<boolean | undefined | null>(false);
    registerValue(SV.callbackArgument0, callbackArgument0);
    registerValue(SV.callbackArgument1, callbackArgument1);

    const sv0 = useSharedValue(0);
    const sv1 = useSharedValue(0);
    const sv2 = useSharedValue(0);

    useEffect(() => {
      sv0.value = withSequence(
        withTiming(100, { duration: 400 }, () => {
          sv1.value = withSequence(
            withTiming(20, { duration: 600 }, (finished?: boolean) => {
              // this animation gets interrupted
              callbackArgument0.value = finished;
              callTracker(Tracker.interruptedAnimation);
            }),
            withTiming(1000, { duration: 600 }, (finished?: boolean) => {
              // execution of this animation never starts
              callTracker(Tracker.animationNotExecuted);
              callbackArgument1.value = finished;
            }),
            withTiming(1000, { duration: 600 }, (finished?: boolean) => {
              // execution of this animation never starts
              callTracker(Tracker.animationNotExecuted);
              callbackArgument1.value = callbackArgument1.value || finished;
            }),
          );
        }),

        withTiming(20, { duration: 300 }, () => {
          sv1.value = withSpring(150, { duration: 500 }, () => {
            callTracker(Tracker.callbackAnimation);
          });
          sv2.value = withSequence(
            withSpring(150, { duration: 300, dampingRatio: 2 }, () => {
              callTracker(Tracker.callbackAnimation);
            }),
            withSpring(10, { duration: 300, dampingRatio: 2 }, () => {
              callTracker(Tracker.callbackAnimation);
            }),
          );
        }),
        withTiming(200, { duration: 400 }),
      );
    });

    const animatedStyle = useAnimatedStyle(() => {
      return { height: 20 + sv0.value, width: 20 + sv1.value, top: sv2.value };
    });

    return (
      <View style={styles.container}>
        <Animated.View style={[styles.animatedBox, animatedStyle]} />
      </View>
    );
  };

  test('Test that all callbacks have been called a correct number of times', async () => {
    await mockAnimationTimer();
    const updatesContainerActive = await recordAnimationUpdates();

    await render(<CallbackComponent />);
    await waitForAnimationUpdates(Snapshots.CallbackCascade.length);
    const updates = updatesContainerActive.getUpdates();
    const nativeUpdates = await updatesContainerActive.getNativeSnapshots();

    expect(updates).toMatchSnapshots(Snapshots.CallbackCascade);
    expect(updates).toMatchNativeSnapshots(nativeUpdates);

    // TODO Fix tests to support boolean values
    expect((await getRegisteredValue(SV.callbackArgument0)).onJS).toBe(0);
    expect((await getRegisteredValue(SV.callbackArgument1)).onJS).toBe(0);

    (
      [
        [Tracker.animationNotExecuted, 2],
        [Tracker.interruptedAnimation, 1],
        [Tracker.callbackAnimation, 3],
      ] as const
    ).forEach(([trackerRef, counts]) => {
      expect(getTrackerCallCount(trackerRef)).toBeCalled(counts);
      expect(getTrackerCallCount(trackerRef)).toBeCalledUI(counts);
      expect(getTrackerCallCount(trackerRef)).toBeCalledJS(0);
    });
  });
});

// TODO: Fix this test case
// Expected ["ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE"] received ["ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT"], mode: AUTO
// describe(`Test all callbacks have been called in valid order`, () => {
//   const SV_REF = 'SV_REF';

//   const CallbackComponent = () => {
//     const callbackArray = useSharedValue<Array<string>>([]);
//     registerValue(SV_REF, callbackArray);

//     const sv0 = useSharedValue(0);
//     const sv1 = useSharedValue(0);
//     const sv2 = useSharedValue(0);

//     useEffect(() => {
//       sv0.value = withSequence(
//         // finishes at 100
//         withTiming(200, { duration: 100 }, () => {
//           callbackArray.value = [...callbackArray.value, 'ONE'];

//           sv1.value = withSequence(
//             // finishes at 200
//             withTiming(100, { duration: 100 }, () => {
//               callbackArray.value = [...callbackArray.value, 'TWO'];
//             }),

//             // cancelled at 600
//             withTiming(50, { duration: 600 }, () => {
//               callbackArray.value = [...callbackArray.value, 'SIX'];
//             }),
//             // cancelled at 600
//             withTiming(100, { duration: 600 }, () => {
//               callbackArray.value = [...callbackArray.value, 'SEVEN'];
//             }),
//           );
//         }),
//         // finishes at 300
//         withTiming(100, { duration: 200 }, () => {
//           callbackArray.value = [...callbackArray.value, 'THREE'];

//           // finishes at 450
//           sv2.value = withSequence(
//             withTiming(150, { duration: 150 }, () => {
//               callbackArray.value = [...callbackArray.value, 'FOUR'];
//             }),

//             // finishes at 600
//             withTiming(150, { duration: 100 }, () => {
//               callbackArray.value = [...callbackArray.value];

//               // cancels all sv1 animations at 600, finishes at 800
//               sv1.value = withTiming(200, { duration: 100 }, () => {
//                 callbackArray.value = [...callbackArray.value, 'EIGHT'];
//               });
//             }),
//           );
//         }),
//         // finishes at 500
//         withTiming(200, { duration: 200 }, () => {
//           callbackArray.value = [...callbackArray.value, 'FIVE'];
//         }),
//         // finishes at 900
//         withTiming(200, { duration: 400 }, () => {
//           callbackArray.value = [...callbackArray.value, 'NINE'];
//         }),
//       );
//     });

//     const animatedStyle = useAnimatedStyle(() => {
//       return { height: 20 + sv0.value, width: 20 + sv1.value, top: sv2.value };
//     });

//     return (
//       <View style={styles.container}>
//         <Animated.View style={[styles.animatedBox, animatedStyle]} />
//       </View>
//     );
//   };

// test('Test order of cascade of callback (no direct nesting nesting)', async () => {
//   await mockAnimationTimer();
//   const updatesContainerActive = await recordAnimationUpdates();
//   await render(<CallbackComponent />);
//   await waitForAnimationUpdates(Snapshots.CallbackOrder.length);
//   const updates = updatesContainerActive.getUpdates();
//   const nativeUpdates = await updatesContainerActive.getNativeSnapshots();
//   expect(updates).toMatchSnapshots(Snapshots.CallbackOrder);
//   expect(updates).toMatchNativeSnapshots(nativeUpdates);

//   expect((await getRegisteredValue(SV_REF)).onJS).toBe([
//     'ONE',
//     'TWO',
//     'THREE',
//     'FOUR',
//     'FIVE',
//     'SIX',
//     'SEVEN',
//     'EIGHT',
//     'NINE',
//   ]);
// });
// });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    width: 0,
    backgroundColor: 'darkorange',
    height: 80,
    marginLeft: 30,
  },
});
