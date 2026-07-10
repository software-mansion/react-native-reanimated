import type { RuntimeTestSuite } from '../types';

type Describe = (name: string, buildSuite: () => void) => void;

export const REANIMATED_TEST_SUITES: RuntimeTestSuite[] = [
  {
    testSuiteName: 'animations',
    importTest: () => {
      const { describe } = require('../ReJest/RuntimeTestsApi') as {
        describe: Describe;
      };
      describe('*****withTiming***** ⏰', () => {
        require('./tests/animations/withTiming/arrays.test');
        require('./tests/animations/withTiming/basic.test');
        require('./tests/animations/withTiming/objects.test');
        require('./tests/animations/withTiming/colors.test');
        // TODO: Fix this test - tag is not passed to _updateProps, so the recordAnimationUpdates function always receives tag as undefined
        // Uncomment test when fixed
        // require('./tests/animations/withTiming/easing.test');
        // TODO: investigate and fix, it hangs
        // require('./tests/animations/withTiming/transformMatrices.test');
      });
      describe('*****withSpring*****', () => {
        // TODO: investigate and fix, it hangs
        // require('./tests/animations/withSpring/variousConfig.test');
      });
      describe('*****withDecay*****', () => {
        // TODO: investigate and fix, it hangs
        // require('./tests/animations/withDecay/basic.test');
      });
      describe('*****withSequence*****', () => {
        // TODO: investigate and fix, it hangs
        // require('./tests/animations/withSequence/callbackCascade.test');
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
    testSuiteName: 'core',
    importTest: () => {
      require('./tests/core/useAnimatedRef.test');
      // TODO: update expected values
      // require('./tests/core/cancelAnimation.test');
      // TODO: speed up useSharedValue tests, they have unnecessarily long delays
      require('./tests/core/useSharedValue/animationAssigning.test');
      require('./tests/core/useSharedValue/synchronization.test');
      require('./tests/core/useSharedValue/numbers.test');
      require('./tests/core/useSharedValue/arrays.test');
      require('./tests/core/useSharedValue/objects.test');
      require('./tests/core/useSharedValue/assigningObjects.test');
      require('./tests/core/useAnimatedStyle/reuseAnimatedStyle.test');
      // TODO: investigate and fix, it hangs
      // require('./tests/core/useDerivedValue/basic.test');
      require('./tests/core/useDerivedValue/chain.test');
      require('./tests/core/useSharedValue/animationsCompilerApi.test');
      // TODO: onLayout event isn't working on Android
      // require('./tests/core/onLayout.test');
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
      const { describe } = require('../ReJest/RuntimeTestsApi') as {
        describe: Describe;
      };
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
      // TODO: investigate and fix, measure returns null sometimes
      // require('./tests/advancedAPI/measure.test');
      require('./tests/advancedAPI/staticFeatureFlags.test');
    },
  },
  {
    testSuiteName: 'StrictMode',
    // TODO: fix, StrictMode support is currently broken due to our use of `findHostInstance_DEPRECATED`
    disabled: true,
    skipByDefault: true,
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
];
