import React from 'react';

import { describe } from './ReJest/RuntimeTestsApi';
import RuntimeTestsRunner from './ReJest/RuntimeTestsRunner';

export default function RuntimeTestsExample() {
  return (
    <RuntimeTestsRunner
      tests={[
        {
          testSuiteName: 'animations',
          importTest: () => {
            describe('*****withTiming***** ⏰', () => {
              require('./tests/animations/withTiming/arrays.test');
              require('./tests/animations/withTiming/basic.test');
              require('./tests/animations/withTiming/objects.test');
              require('./tests/animations/withTiming/colors.test');
              // TODO: Fix this test - tag is not passed to _updateProps, so the recordAnimationUpdates function always receives tag as undefined
              // Uncomment test when fixed
              // require('./tests/animations/withTiming/easing.test');
              require('./tests/animations/withTiming/transformMatrices.test');
            });
            describe('*****withSpring*****', () => {
              require('./tests/animations/withSpring/variousConfig.test');
            });
            describe('*****withDecay*****', () => {
              require('./tests/animations/withDecay/basic.test');
            });
            describe('*****withSequence*****', () => {
              require('./tests/animations/withSequence/callbackCascade.test');
              require('./tests/animations/withSequence/cancelAnimation.test');
              require('./tests/animations/withSequence/numbers.test');
              require('./tests/animations/withSequence/arrays.test');
              require('./tests/animations/withSequence/colors.test');
            });
            // TODO: Fix this test - tag is not passed to _updateProps, so the recordAnimationUpdates function always receives tag as undefined
            // Uncomment test when fixed
            // describe('*****withDelay*****', () => {
            //   require('./tests/animations/withDelay/keepSnapshot.test');
            //   require('./tests/animations/withDelay/addDelays.test');
            // });
          },
        },
        {
          testSuiteName: 'memory',
          importTest: () => {
            require('./tests/memory/createSerializable.test');
            require('./tests/memory/createSerializableOnUI.test');
            require('./tests/memory/isSerializableRef.test');
            require('./tests/memory/synchronizable.test');
            require('./tests/memory/customSerializable.test');
            require('./tests/memory/hybridObjectSupport.test');
          },
        },
        {
          testSuiteName: 'runtimes',
          importTest: () => {
            require('./tests/runtimes/createWorkletRuntime.test');
            require('./tests/runtimes/scheduleOnRN.test');
            require('./tests/runtimes/runOnUISync.test');
            require('./tests/runtimes/scheduleOnRuntime.test');
            require('./tests/runtimes/scheduleOnUI.test');
            require('./tests/runtimes/runOnRuntimeSync.test');
          },
        },
        {
          testSuiteName: 'run loop',
          importTest: () => {
            require('./tests/runLoop/requestAnimationFrame.test');
            require('./tests/runLoop/cancelAnimationFrame.test');
            require('./tests/runLoop/setTimeout.test');
            require('./tests/runLoop/clearTimeout.test');
            require('./tests/runLoop/setImmediate.test');
            require('./tests/runLoop/clearImmediate.test');
            require('./tests/runLoop/setInterval.test');
            require('./tests/runLoop/clearInterval.test');
            require('./tests/runLoop/queueMicrotask.test');
            require('./tests/runLoop/executionOrder.test');
          },
        },
        {
          testSuiteName: 'core',
          importTest: () => {
            require('./tests/core/useAnimatedRef.test');
            require('./tests/core/cancelAnimation.test');
            require('./tests/core/useSharedValue/numbers.test');
            require('./tests/core/useSharedValue/arrays.test');
            require('./tests/core/useSharedValue/objects.test');
            require('./tests/core/useSharedValue/assigningObjects.test');
            require('./tests/core/useAnimatedStyle/reuseAnimatedStyle.test');
            require('./tests/core/useDerivedValue/basic.test');
            require('./tests/core/useDerivedValue/chain.test');
            require('./tests/core/useSharedValue/animationsCompilerApi.test');
            require('./tests/core/onLayout.test');
          },
        },
        {
          testSuiteName: 'props',
          importTest: () => {
            require('./tests/props/boxShadow.test');
          },
        },
        {
          testSuiteName: 'utilities',
          importTest: () => {
            require('./tests/utilities/relativeCoords.test');
          },
        },
        {
          testSuiteName: 'entering and exiting',
          importTest: () => {
            require('./tests/layoutAnimations/entering/enteringColors.test');
            require('./tests/layoutAnimations/entering/predefinedEntering.test');
            require('./tests/layoutAnimations/exiting/predefinedExiting.test');
          },
          // TODO: Fix this test - shadowNodeWrapper is not passed to _notifyAboutProgress, so the _updateNativeSnapshot function always receives shadowNodeWrapper as undefined
          // Remove disabled and skipByDefault when fixed
          disabled: true,
          skipByDefault: true,
        },
        {
          testSuiteName: 'layout transitions',
          importTest: () => {
            describe('Compare layout transitions with **constant view size** with snapshots', () => {
              require('./tests/layoutAnimations/layout/predefinedLayoutPosition.test');
            });
            describe('Compare predefined layout transitions including view **size changes** with snapshots', () => {
              require('./tests/layoutAnimations/layout/positionAndSize.test');
            });
            require('./tests/layoutAnimations/layout/custom.test');
          },
          // TODO: Fix this test - shadowNodeWrapper is not passed to _notifyAboutProgress, so the _updateNativeSnapshot function always receives shadowNodeWrapper as undefined
          // Remove disabled and skipByDefault when fixed
          disabled: true,
          skipByDefault: true,
        },
        {
          testSuiteName: 'keyframe animations',
          importTest: () => {
            require('./tests/layoutAnimations/keyframe/basic.test');
          },
          // TODO: Fix this test - shadowNodeWrapper is not passed to _notifyAboutProgress, so the _updateNativeSnapshot function always receives shadowNodeWrapper as undefined
          // Remove disabled and skipByDefault when fixed
          disabled: true,
          skipByDefault: true,
        },
        {
          testSuiteName: 'advanced API',
          importTest: () => {
            require('./tests/advancedAPI/useFrameCallback.test');
            require('./tests/advancedAPI/measure.test');
            require('./tests/advancedAPI/staticFeatureFlags.test');
          },
        },
        {
          testSuiteName: 'babel plugin',
          importTest: () => {
            require('./tests/plugin/fileWorkletization.test');
            require('./tests/plugin/contextObjects.test');
            require('./tests/plugin/workletClasses.test');
            require('./tests/plugin/recursion.test');
          },
        },
        {
          testSuiteName: 'StrictMode',
          importTest: () => {
            require('./tests/StrictMode/StrictMode.test');
          },
        },
        {
          skipByDefault: true,
          testSuiteName: 'self-tests',
          importTest: () => {
            require('./tests/TestsOfTestingFramework.test');
          },
        },
      ]}
    />
  );
}
