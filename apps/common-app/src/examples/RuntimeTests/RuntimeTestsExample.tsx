import React from 'react';
import RuntimeTestsRunner from './ReanimatedRuntimeTestsRunner/RuntimeTestsRunner';
import { describe } from './ReanimatedRuntimeTestsRunner/RuntimeTestsApi';

export default function RuntimeTestsExample() {
  return (
    <RuntimeTestsRunner
      importButtons={[
        {
          skipByDefault: true,
          testSuiteName: 'Tests of testing framework',
          importTest: () => {
            require('./tests/TestsOfTestingFramework.test');
          },
        },
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
            describe('*****withDelay*****', () => {
              require('./tests/animations/withDelay/keepSnapshot.test');
              require('./tests/animations/withDelay/addDelays.test');
            });
          },
        },
        {
          testSuiteName: 'core',
          importTest: () => {
            require('./tests/core/cancelAnimation.test');
            require('./tests/core/useSharedValue.test');
            require('./tests/core/useAnimatedStyle/reuseAnimatedStyle.test');
            require('./tests/core/useDerivedValue/basic.test');
            require('./tests/core/useDerivedValue/chain.test');
          },
        },
        {
          testSuiteName: 'utilities',
          importTest: () => {
            require('./tests/utilities/relativeCoords.test');
          },
        },
        {
          testSuiteName: 'layoutAnimations',
          importTest: () => {
            require('./tests/layoutAnimations/entering/enteringColors.test');
            require('./tests/layoutAnimations/entering/predefinedEntering.test');
            require('./tests/layoutAnimations/exiting/predefinedExiting.test');
            require('./tests/layoutAnimations/layout/predefinedLayoutPosition.test');
          },
        },
        {
          testSuiteName: 'advancedAPI',
          importTest: () => {
            require('./tests/advancedAPI/useFrameCallback.test');
            // require('./tests/advancedAPI/measure.test'); // crash on Android
          },
        },
        {
          testSuiteName: 'babelPlugin',
          importTest: () => {
            require('./tests/plugin/fileWorkletization.test');
          },
        },
      ]}
    />
  );
}
