/* eslint-disable @typescript-eslint/no-var-requires */
import { runOnUISync, runOnRuntimeSync } from 'react-native-worklets';
import {
  describe,
  expect,
  getWorkletRuntimeFromPool,
  test,
} from '../../ReJest/RuntimeTestsApi';

const expectedErrorMessage =
  '[Worklets] Accessing TurboModules is not allowed on Worklet Runtimes.';

const bundleModeEnabled = !!globalThis._WORKLETS_BUNDLE_MODE_ENABLED;
const proxy = globalThis.__workletsModuleProxy as
  | { getStaticFeatureFlag: (name: string) => boolean }
  | undefined;
const fetchPreviewEnabled =
  bundleModeEnabled && !!proxy?.getStaticFeatureFlag('FETCH_PREVIEW_ENABLED');

describe('accessing Turbo Modules on Worklet Runtimes', () => {
  const workerRuntime = getWorkletRuntimeFromPool('test');

  const testFn = bundleModeEnabled ? test : test.skip;
  const previewOnFn = fetchPreviewEnabled ? test : test.skip;
  const previewOffFn =
    bundleModeEnabled && !fetchPreviewEnabled ? test : test.skip;

  const targets = [
    {
      targetRuntime: 'UI',
      runOnTarget: <T>(worklet: () => T) => runOnUISync(worklet),
    },
    {
      targetRuntime: 'Worker',
      runOnTarget: <T>(worklet: () => T) =>
        runOnRuntimeSync(workerRuntime, worklet),
    },
  ];

  targets.forEach(({ targetRuntime, runOnTarget }) => {
    describe(`on ${targetRuntime} Runtime`, () => {
      testFn('throws for non-polyfilled modules', () => {
        const errorMessage = runOnTarget(() => {
          'worklet';
          try {
            (
              require('react-native/Libraries/TurboModule/TurboModuleRegistry') as TurboModuleRegistryShape
            ).get('NonExistentTurboModule');
            return null;
          } catch (e) {
            return (e as Error).message;
          }
        });

        expect(errorMessage).toInclude(expectedErrorMessage);
      });

      previewOffFn(
        'throws for Networking when `FETCH_PREVIEW_ENABLED` is off',
        () => {
          const errorMessage = runOnTarget(() => {
            'worklet';
            try {
              (
                require('react-native/Libraries/TurboModule/TurboModuleRegistry') as TurboModuleRegistryShape
              ).get('Networking');
              return null;
            } catch (e) {
              return (e as Error).message;
            }
          });

          expect(errorMessage).toInclude(expectedErrorMessage);
        }
      );

      previewOnFn(
        'returns the Networking polyfill when `FETCH_PREVIEW_ENABLED` is on',
        () => {
          const outcome = runOnTarget(() => {
            'worklet';
            try {
              const value = (
                require('react-native/Libraries/TurboModule/TurboModuleRegistry') as TurboModuleRegistryShape
              ).get('Networking');
              return value !== undefined ? 'ok' : 'undefined';
            } catch (e) {
              return (e as Error).message;
            }
          });

          expect(outcome).toInclude('ok');
        }
      );
    });
  });
});

type TurboModuleRegistryShape = { get: (name: string) => unknown };
