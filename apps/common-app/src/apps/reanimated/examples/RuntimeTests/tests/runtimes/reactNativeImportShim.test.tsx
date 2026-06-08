import { runOnUISync, runOnRuntimeSync } from 'react-native-worklets';
import {
  describe,
  expect,
  getWorkletRuntimeFromPool,
  test,
} from '../../ReJest/RuntimeTestsApi';

const expectedErrorMessage =
  "Importing 'react-native' is not allowed on a Worklet Runtime";

describe("require('react-native') on Worklet Runtimes", () => {
  const workerRuntime = getWorkletRuntimeFromPool('reactNativeImportShim');

  const testFn = globalThis._WORKLETS_BUNDLE_MODE_ENABLED ? test : test.skip;

  testFn('throws on the UI Runtime', () => {
    const errorMessage = runOnUISync(() => {
      'worklet';
      try {
        require('react-native');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });

    expect(errorMessage).toInclude(expectedErrorMessage);
  });

  testFn('throws on a Worker Runtime', () => {
    const errorMessage = runOnRuntimeSync(workerRuntime, () => {
      'worklet';
      try {
        require('react-native');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });

    expect(errorMessage).toInclude(expectedErrorMessage);
  });
});
