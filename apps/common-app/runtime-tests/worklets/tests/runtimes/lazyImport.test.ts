import { RuntimeKind } from 'react-native-worklets';

import {
  createTestValue,
  describe,
  expect,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { dispatchWorklet } from '../runLoop/dispatchWorklet';

function importLazyModule() {
  'worklet';
  return import('./lazyImportModule');
}

describe('lazy import()', () => {
  test('evaluates the module on the RN Runtime', async () => {
    const module = await importLazyModule();

    expect(module.evaluatedOn).toBe(RuntimeKind.ReactNative);
  });

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'evaluates the module on the importing runtime, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `lazy_import_done_${runtimeKind}`;
      const [evaluatedOn, setEvaluatedOn] = createTestValue<
        RuntimeKind | string
      >('not_evaluated');

      dispatchWorklet(() => {
        'worklet';
        importLazyModule()
          .then((module) => setEvaluatedOn(module.evaluatedOn, notification))
          .catch((error) => setEvaluatedOn(String(error), notification));
      }, runtimeKind);

      await waitForNotification(notification);
      expect(evaluatedOn.value).toBe(runtimeKind);
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'returns the same module instance on a second import, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `lazy_import_twice_done_${runtimeKind}`;
      const [sameInstance, setSameInstance] = createTestValue<boolean | string>(
        'not_evaluated'
      );

      dispatchWorklet(() => {
        'worklet';
        Promise.all([importLazyModule(), importLazyModule()])
          .then(([first, second]) =>
            setSameInstance(first === second, notification)
          )
          .catch((error) => setSameInstance(String(error), notification));
      }, runtimeKind);

      await waitForNotification(notification);
      expect(sameInstance.value).toBe(true);
    }
  );
});
