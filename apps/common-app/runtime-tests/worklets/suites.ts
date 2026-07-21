import { isBundleModeEnabled } from 'react-native-worklets';

import type { RuntimeTestSuite } from '../types';

export const WORKLETS_TEST_SUITES: RuntimeTestSuite[] = [
  {
    testSuiteName: 'memory',
    importTest: () => {
      require('./tests/memory/createSerializable.test');
      require('./tests/memory/createSerializableOnUI.test');
      require('./tests/memory/isSerializableRef.test');
      require('./tests/memory/synchronizable.test');
      require('./tests/memory/customSerializable.test');
      require('./tests/memory/hybridObjectSupport.test');
      require('./tests/memory/shareable.test');
    },
  },
  {
    testSuiteName: 'runtimes',
    importTest: () => {
      __DEV__ && require('./tests/runtimes/errorTraces.test');
      __DEV__ && require('./tests/runtimes/loggingFromWorkletRuntime.test');
      require('./tests/runtimes/createWorkletRuntime.test');
      require('./tests/runtimes/scheduleOnRN.test');
      require('./tests/runtimes/runOnUISync.test');
      require('./tests/runtimes/scheduleOnRuntime.test');
      require('./tests/runtimes/scheduleOnUI.test');
      require('./tests/runtimes/runOnRuntimeSync.test');
      require('./tests/runtimes/runOnUIAsync.test');
      require('./tests/runtimes/runOnRuntimeAsync.test');
      require('./tests/runtimes/runOnRuntimeAsyncWithId.test');
      require('./tests/runtimes/runOnRuntimeSyncWithId.test');
      require('./tests/runtimes/scheduleOnRuntimeWithId.test');
    },
  },
  {
    testSuiteName: 'bundle mode core',
    importTest: () => {
      require('./tests/runtimes/reactNativeImportShim.test');
      require('./tests/runtimes/turboModuleRegistryShim.test');
    },
    disabled: !isBundleModeEnabled(),
    skipByDefault: true,
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
    testSuiteName: 'babel plugin',
    importTest: () => {
      require('./tests/plugin/contextObjects.test');
      require('./tests/plugin/fileWorkletization.test');
      require('./tests/plugin/jsxInWorklets.test');
      require('./tests/plugin/recursion.test');
      require('./tests/plugin/versionMismatch.test');
      require('./tests/plugin/workletClasses.test');
    },
  },
];
