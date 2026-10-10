import type * as NativeReanimated from '../src/ReanimatedModule/NativeReanimated';

const UI_RUNTIME_HOLDER = { holder: 'ui runtime' };
const UI_SCHEDULER_HOLDER = { holder: 'ui scheduler' };

describe('installTurboModule', () => {
  let consoleWarn: jest.SpyInstance;

  beforeEach(() => {
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {
      // noop
    });
    delete global.__reanimatedModuleProxy;
  });

  afterEach(() => {
    delete global.__reanimatedModuleProxy;
    consoleWarn.mockRestore();
  });

  test('exposes the UI runtime holders to the native module only while it installs', () => {
    let holdersDuringInstall: readonly unknown[] = [];
    jest.isolateModules(() => {
      jest.doMock('react-native-worklets', () => ({
        ...jest.requireActual<object>('react-native-worklets'),
        getUIRuntimeHolder: () => UI_RUNTIME_HOLDER,
        getUISchedulerHolder: () => UI_SCHEDULER_HOLDER,
      }));
      jest.doMock('../src/specs', () => ({
        ReanimatedTurboModule: {
          installTurboModule: () => {
            holdersDuringInstall = [
              globalThis.__UI_WORKLET_RUNTIME_HOLDER,
              globalThis.__UI_SCHEDULER_HOLDER,
            ];
            global.__reanimatedModuleProxy = {} as NonNullable<
              typeof global.__reanimatedModuleProxy
            >;
            return true;
          },
        },
      }));
      jest
        .requireActual<typeof NativeReanimated>(
          '../src/ReanimatedModule/NativeReanimated'
        )
        .createNativeReanimatedModule();
    });

    expect(holdersDuringInstall).toEqual([
      UI_RUNTIME_HOLDER,
      UI_SCHEDULER_HOLDER,
    ]);
    expect(Object.hasOwn(globalThis, '__UI_WORKLET_RUNTIME_HOLDER')).toBe(
      false
    );
    expect(Object.hasOwn(globalThis, '__UI_SCHEDULER_HOLDER')).toBe(false);
  });
});
