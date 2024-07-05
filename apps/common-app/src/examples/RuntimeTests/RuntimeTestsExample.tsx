import React from 'react';
import RuntimeTestsRunner from './ReanimatedRuntimeTestsRunner/RuntimeTestsRunner';

export default function RuntimeTestsExample() {
  return (
    <RuntimeTestsRunner
      importButtons={[
        {
          testSuiteName: 'Tests of testing framework',
          importTest: () => {
            require('./tests/TestsOfTestingFramework.test');
          },
        },
        {
          testSuiteName: 'animations',
          importTest: () => {
            require('./tests/animations');
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
      ]}
    />
  );
}
