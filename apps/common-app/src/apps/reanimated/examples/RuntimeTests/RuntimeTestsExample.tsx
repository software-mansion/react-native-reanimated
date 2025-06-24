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
              require('./tests/animations/withTiming/easing.test');
              require('./tests/animations/withTiming/transformMatrices.test');
            });
            // TODO: Fix this test
            // describe('*****withSpring*****', () => {
            //   require('./tests/animations/withSpring/variousConfig.test');
            // });
            describe('*****withDecay*****', () => {
              require('./tests/animations/withDecay/basic.test');
            });
            describe('*****withSequence*****', () => {
              require('./tests/animations/withSequence/callbackCascade.test');
              require('./tests/animations/withSequence/cancelAnimation.test');
              // TODO: Fix this test
              // require('./tests/animations/withSequence/numbers.test');
              require('./tests/animations/withSequence/arrays.test');
              require('./tests/animations/withSequence/colors.test');
            });
            // TODO: Fix this test
            // describe('*****withDelay*****', () => {
            //   require('./tests/animations/withDelay/keepSnapshot.test');
            //   require('./tests/animations/withDelay/addDelays.test');
            // });
          },
        },
        {
          testSuiteName: 'shareables',
          importTest: () => {
            require('./tests/shareables/makeShareableClone.test');
            require('./tests/shareables/makeShareableCloneOnUI.test');
          },
        },
        {
          testSuiteName: 'core',
          importTest: () => {
            require('./tests/core/cancelAnimation.test');

            require('./tests/core/useSharedValue/numbers.test');
            // TODO: Fix this test
            // require('./tests/core/useSharedValue/arrays.test');
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
          disabled: true,
          skipByDefault: true,
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
        },
        {
          testSuiteName: 'keyframe animations',
          importTest: () => {
            require('./tests/layoutAnimations/keyframe/basic.test');
          },
        },
        {
          testSuiteName: 'advanced API',
          importTest: () => {
            require('./tests/advancedAPI/useFrameCallback.test');
            require('./tests/advancedAPI/measure.test');
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
