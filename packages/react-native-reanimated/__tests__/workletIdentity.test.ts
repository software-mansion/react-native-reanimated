import { renderHook } from '@testing-library/react-hooks';
import { scheduleOnUI } from 'react-native-worklets';

import { cancelAnimation } from '../src/animation/util.native';
import type { SharedValue } from '../src/commonTypes';
import FrameCallbackRegistryJS from '../src/frameCallback/FrameCallbackRegistryJS.native';
import { useAnimatedRef } from '../src/hook/useAnimatedRef.native';
import { makeMutable } from '../src/mutables.native';
import { ReanimatedModule } from '../src/ReanimatedModule';

jest.mock('../src/fabricUtils', () => ({
  getShadowNodeWrapperFromRef: jest.fn((ref) => ref),
}));

jest.mock('../src/ReanimatedModule', () => ({
  ReanimatedModule: {
    createDetachedShadowNodeWrapper: jest.fn((wrapper) => ({ wrapper })),
  },
}));

jest.mock('react-native-worklets', () => ({
  createShareable: (
    _runtimeId: number,
    initial: unknown,
    config?: {
      guestDecorator: (guest: Record<string, unknown>) => unknown;
    }
  ) => {
    const guest = {
      getSync: () => initial,
      setAsync: jest.fn(),
    };
    return config?.guestDecorator(guest) ?? guest;
  },
  createSynchronizable: () => ({
    getDirty: () => false,
  }),
  hasSerializableMapping: () => false,
  isWorkletFunction: () => true,
  runOnUISync: jest.fn(),
  RuntimeKind: { ReactNative: 1 },
  scheduleOnUI: jest.fn(),
  setSerializableMapping: jest.fn(),
  UIRuntimeId: 2,
}));

describe('Reanimated worklet identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.__RUNTIME_KIND = 1;
  });

  test('reuses shared value write and modify worklets', () => {
    const mutable = makeMutable(0);
    mutable.value = 1;
    mutable.value = 2;

    const writeCalls = jest.mocked(scheduleOnUI).mock.calls;
    expect(writeCalls[0][0]).toBe(writeCalls[1][0]);
    expect(writeCalls[0].slice(1)).toEqual([mutable, 1]);
    expect(writeCalls[1].slice(1)).toEqual([mutable, 2]);

    jest.mocked(scheduleOnUI).mockClear();
    const increment = (value: number) => value + 1;
    mutable.modify(increment);
    mutable.modify(increment, false);

    const modifyCalls = jest.mocked(scheduleOnUI).mock.calls;
    expect(modifyCalls[0][0]).toBe(modifyCalls[1][0]);
    expect(modifyCalls[0].slice(1)).toEqual([mutable, increment, true]);
    expect(modifyCalls[1].slice(1)).toEqual([mutable, increment, false]);
  });

  test('reuses the cancellation worklet', () => {
    const first = { value: 1 } as SharedValue<number>;
    const second = { value: 2 } as SharedValue<number>;

    cancelAnimation(first);
    cancelAnimation(second);

    const calls = jest.mocked(scheduleOnUI).mock.calls;
    expect(calls[0][0]).toBe(calls[1][0]);
    expect(calls[0].slice(1)).toEqual([first]);
    expect(calls[1].slice(1)).toEqual([second]);
  });

  test('reuses frame callback lifecycle worklets', () => {
    const registry = new FrameCallbackRegistryJS();
    jest.mocked(scheduleOnUI).mockClear();
    const callback = jest.fn();

    registry.registerFrameCallback(callback);
    registry.registerFrameCallback(callback);

    const registerCalls = jest.mocked(scheduleOnUI).mock.calls;
    expect(registerCalls[0][0]).toBe(registerCalls[1][0]);

    jest.mocked(scheduleOnUI).mockClear();
    registry.unregisterFrameCallback(0);
    registry.unregisterFrameCallback(1);

    const unregisterCalls = jest.mocked(scheduleOnUI).mock.calls;
    expect(unregisterCalls[0][0]).toBe(unregisterCalls[1][0]);
  });

  test('detaches animated ref wrappers before stable UI dispatch', () => {
    const firstWrapper = { id: 1 };
    const secondWrapper = { id: 2 };
    const { result } = renderHook(() => useAnimatedRef());

    result.current(firstWrapper as never);
    result.current(secondWrapper as never);

    const detachCalls = jest.mocked(
      ReanimatedModule.createDetachedShadowNodeWrapper
    ).mock.calls;
    expect(detachCalls).toEqual([[firstWrapper], [secondWrapper]]);

    const dispatchCalls = jest.mocked(scheduleOnUI).mock.calls;
    expect(dispatchCalls[0][0]).toBe(dispatchCalls[1][0]);
    expect(dispatchCalls[0][2]).toEqual({ wrapper: firstWrapper });
    expect(dispatchCalls[1][2]).toEqual({ wrapper: secondWrapper });
  });
});
