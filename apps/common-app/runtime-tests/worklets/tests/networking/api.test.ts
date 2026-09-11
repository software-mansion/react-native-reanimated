import {
  isBundleModeEnabled,
  runOnRuntimeSync,
  runOnUISync,
} from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimesFromPool,
  test,
} from '../../../ReJest/RuntimeTestsApi';

const bundleModeEnabled = isBundleModeEnabled();

describe('networking API on Worklet Runtimes', () => {
  const [workerRuntime] = getWorkletRuntimesFromPool(1);

  const testFn = bundleModeEnabled ? test : test.skip;

  const targets = [
    {
      runOnTarget: <T>(worklet: () => T) => runOnUISync(worklet),
      targetRuntime: 'UI',
    },
    {
      runOnTarget: <T>(worklet: () => T) =>
        runOnRuntimeSync(workerRuntime, worklet),
      targetRuntime: 'Worker',
    },
  ];

  targets.forEach(({ runOnTarget, targetRuntime }) => {
    describe(`on ${targetRuntime} Runtime`, () => {
      testFn('installs XMLHttpRequest', () => {
        const type = runOnTarget(() => {
          'worklet';
          return typeof globalThis.XMLHttpRequest;
        });

        expect(type).toBe('function');
      });

      testFn('XMLHttpRequest implements the state machine', () => {
        const outcome = runOnTarget(() => {
          'worklet';
          const xhr = new globalThis.XMLHttpRequest();
          if (xhr.UNSENT !== 0 || xhr.DONE !== 4) {
            return 'wrong state constants';
          }
          const initialReadyState: number = xhr.readyState;
          if (initialReadyState !== xhr.UNSENT) {
            return 'initial readyState is not UNSENT';
          }
          try {
            xhr.setRequestHeader('X-Test', 'value');
            return 'setRequestHeader did not throw before open';
          } catch {
            // Expected.
          }
          xhr.open('GET', 'https://example.com/');
          const openedReadyState: number = xhr.readyState;
          if (openedReadyState !== xhr.OPENED) {
            return 'readyState is not OPENED after open';
          }
          xhr.setRequestHeader('X-Test', 'value');
          if (xhr.getAllResponseHeaders() !== '') {
            return 'response headers are not empty before send';
          }
          return 'ok';
        });

        expect(outcome).toBe('ok');
      });
    });
  });
});
