/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { runOnUISync, runOnRuntimeSync } from 'react-native-worklets';
import {
  describe,
  expect,
  getWorkletRuntimeFromPool,
  test,
} from '../../ReJest/RuntimeTestsApi';

describe("importing 'react-native' on Worklet Runtimes", () => {
  const workerRuntime = getWorkletRuntimeFromPool('test');

  const testFn = globalThis._WORKLETS_BUNDLE_MODE_ENABLED ? test : test.skip;

  const targets = [
    {
      targetRuntime: 'UI',
      runOnTarget: <TReturn>(worklet: () => TReturn) => runOnUISync(worklet),
    },
    {
      targetRuntime: 'Worker',
      runOnTarget: <TReturn>(worklet: () => TReturn) =>
        runOnRuntimeSync(workerRuntime, worklet),
    },
  ];

  targets.forEach(({ targetRuntime, runOnTarget }) => {
    describe(`on ${targetRuntime} Runtime`, () => {
      testFn('works without access', () => {
        const status = runOnTarget(() => {
          'worklet';
          const reactNative = require('react-native');
          return typeof reactNative === 'object';
        });

        expect(status).toBe(true);
      });

      testFn('throws when accessing unsafe APIs', async () => {
        await expect(() => {
          runOnTarget(() => {
            'worklet';
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const platform = require('react-native').Platform;
            console.log(platform);
          });
        }).toThrow();
      });
    });
  });
});
