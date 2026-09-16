import {
  isBundleModeEnabled,
  runOnRuntimeSync,
  runOnUISync,
  RuntimeKind,
} from 'react-native-worklets';

import {
  createTestValue,
  describe,
  expect,
  getWorkletRuntimesFromPool,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { dispatchWorklet } from '../runLoop/dispatchWorklet';

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
      testFn('installs the networking globals', () => {
        const missingGlobals = runOnTarget(() => {
          'worklet';
          const globalNames = ['XMLHttpRequest', 'Blob', 'FileReader'];
          return globalNames
            .filter(
              (name) =>
                typeof (globalThis as unknown as Record<string, unknown>)[
                  name
                ] !== 'function'
            )
            .join(',');
        });

        expect(missingGlobals).toBe('');
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

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'FileReader completes when started from a Promise continuation, runtime: **%s**',
    async (runtimeKind) => {
      const notification = 'file_reader_from_continuation';
      const [flag, setFlag] = createTestValue('not_ok');

      /**
       * This is the shape of every `fetch` body read - `whatwg-fetch` starts
       * the read from a Promise continuation, which runs after the Worklets
       * microtask queue was already drained for the current task.
       */
      dispatchWorklet(() => {
        'worklet';
        Promise.resolve()
          .then(
            () =>
              new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error('read failed'));
                reader.readAsText(new Blob(['content']) as unknown as Blob);
              })
          )
          .then((text) => setFlag(text, notification))
          .catch((error) => setFlag(String(error), notification));
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('content');
    }
  );
});
