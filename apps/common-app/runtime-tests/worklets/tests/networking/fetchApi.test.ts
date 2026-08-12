import {
  createWorkletRuntime,
  isBundleModeEnabled,
  runOnRuntimeSync,
  runOnUISync,
} from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimeFromPool,
  test,
} from '../../../ReJest/RuntimeTestsApi';

const bundleModeEnabled = isBundleModeEnabled();

describe('networking API on Worklet Runtimes', () => {
  const workerRuntime = getWorkletRuntimeFromPool('test');

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
          const globalNames = [
            'fetch',
            'Headers',
            'Request',
            'Response',
            'XMLHttpRequest',
            'Blob',
            'FileReader',
            'FormData',
            'AbortController',
            'AbortSignal',
          ];
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

      testFn('installs fetch from the whatwg-fetch polyfill', () => {
        const isPolyfill = runOnTarget(() => {
          'worklet';
          return (
            (globalThis.fetch as unknown as { polyfill?: boolean })
              .polyfill === true
          );
        });

        expect(isPolyfill).toBe(true);
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

      testFn('AbortController aborts its signal', () => {
        const outcome = runOnTarget(() => {
          'worklet';
          const controller = new AbortController();
          const signal = controller.signal as unknown as {
            aborted: boolean;
            reason: { name?: string };
            addEventListener: (type: string, listener: () => void) => void;
          };
          let abortEvents = 0;
          signal.addEventListener('abort', () => {
            abortEvents++;
          });
          if (signal.aborted) {
            return 'signal aborted before abort';
          }
          controller.abort();
          controller.abort();
          if (!signal.aborted) {
            return 'signal not aborted after abort';
          }
          if (abortEvents !== 1) {
            return `expected 1 abort event, got ${abortEvents}`;
          }
          if (signal.reason?.name !== 'AbortError') {
            return 'abort reason is not an AbortError';
          }
          return 'ok';
        });

        expect(outcome).toBe('ok');
      });

      testFn('FormData encodes multipart bodies', () => {
        const outcome = runOnTarget(() => {
          'worklet';
          const formData = new FormData() as unknown as {
            append: (name: string, value: string) => void;
            getAll: (name: string) => Array<string>;
            getParts: () => Array<{ string: string; fieldName: string }>;
            __encodeMultipart: () => { body: ArrayBuffer; contentType: string };
          };
          formData.append('name', 'value');
          formData.append('name', 'other');
          if (formData.getAll('name').join(',') !== 'value,other') {
            return 'getAll returned wrong entries';
          }
          if (formData.getParts()[0].fieldName !== 'name') {
            return 'getParts returned wrong parts';
          }
          // eslint-disable-next-line no-underscore-dangle
          const { body, contentType } = formData.__encodeMultipart();
          const boundaryMatch = contentType.match(
            /^multipart\/form-data; boundary=(.+)$/
          );
          if (boundaryMatch === null) {
            return `wrong content type: ${contentType}`;
          }
          const bytes = new Uint8Array(body);
          let encoded = '';
          for (let i = 0; i < bytes.length; i++) {
            encoded += String.fromCharCode(bytes[i]);
          }
          if (!encoded.startsWith(`--${boundaryMatch[1]}\r\n`)) {
            return 'body does not start with the boundary';
          }
          if (!encoded.endsWith(`--${boundaryMatch[1]}--\r\n`)) {
            return 'body does not end with the final boundary';
          }
          if (!encoded.includes('content-disposition: form-data; name="name"')) {
            return 'body is missing the content-disposition header';
          }
          return 'ok';
        });

        expect(outcome).toBe('ok');
      });
    });
  });

  testFn('skips installation when enableNetworking is false', () => {
    const runtime = createWorkletRuntime({
      enableNetworking: false,
      name: 'noNetworking',
    });
    const outcome = runOnRuntimeSync(runtime, () => {
      'worklet';
      const global = globalThis as unknown as Record<string, unknown>;
      // eslint-disable-next-line no-underscore-dangle
      if (global.__workletsNetworking !== undefined) {
        return 'native binding installed';
      }
      if (typeof global.fetch !== 'undefined') {
        return 'fetch installed';
      }
      return 'ok';
    });

    expect(outcome).toBe('ok');
  });
});
