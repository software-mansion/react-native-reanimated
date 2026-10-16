import { act, renderHook } from '@testing-library/react-native';
import { StrictMode } from 'react';

import type { ValueHinge } from '../src';
import { HingeStatus, useAnimatedHinge } from '../src';
import { ReanimatedModule } from '../src/ReanimatedModule';

const HINGE_SENSOR_TYPE = 6;
const OTHER_SENSOR_TYPE = 1;

function resetHingeSensor() {
  delete (globalThis as { __hingeSensor?: unknown }).__hingeSensor;
}

describe('useAnimatedHinge', () => {
  let isRegistrationAccepted = true;
  let nextNativeSensorId = 1;
  let nativeHandler: ((data: ValueHinge) => void) | undefined;
  let availabilityHandler:
    | ((sensorType: number, isAvailable: boolean) => void)
    | undefined;

  beforeEach(() => {
    resetHingeSensor();
    isRegistrationAccepted = true;
    nextNativeSensorId = 1;
    nativeHandler = undefined;
    availabilityHandler = undefined;
    jest.spyOn(ReanimatedModule, 'isSensorAvailable').mockReturnValue(false);
    jest
      .spyOn(ReanimatedModule, 'setSensorAvailabilityHandler')
      .mockImplementation((handler) => {
        availabilityHandler = handler;
      });
    jest
      .spyOn(ReanimatedModule, 'registerSensor')
      .mockImplementation(
        (_sensorType, _interval, _iosReferenceFrame, handler) => {
          if (!isRegistrationAccepted) {
            return -1;
          }
          nativeHandler = handler as unknown as (data: ValueHinge) => void;
          return nextNativeSensorId++;
        }
      );
    jest.spyOn(ReanimatedModule, 'unregisterSensor').mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('starts with a closed angle and an unknown status', () => {
    const { result } = renderHook(() => useAnimatedHinge());

    expect(result.current.hinge.value).toStrictEqual({
      angle: 0,
      status: HingeStatus.UNKNOWN,
    });
    expect(result.current.isAvailable).toBe(false);
  });

  test('registers the hinge before the platform reports it as available', () => {
    renderHook(() => useAnimatedHinge());

    expect(jest.mocked(ReanimatedModule.registerSensor).mock.calls).toEqual([
      [HINGE_SENSOR_TYPE, -1, 0, expect.any(Function)],
    ]);
  });

  test('writes a reading to the shared value', () => {
    const { result } = renderHook(() => useAnimatedHinge());

    const data = { angle: Math.PI / 2, status: HingeStatus.PARTIALLY_OPEN };
    act(() => nativeHandler!({ ...data }));

    expect(result.current.hinge.value).toStrictEqual(data);
  });

  test('reports the hinge as available from the first render when the platform knows it', () => {
    jest.mocked(ReanimatedModule.isSensorAvailable).mockReturnValue(true);
    const renders: boolean[] = [];

    renderHook(() => {
      const { isAvailable } = useAnimatedHinge();
      renders.push(isAvailable);
    });

    expect(renders).toEqual([true]);
  });

  test('renders again when the platform finds the hinge', () => {
    const renders: boolean[] = [];
    renderHook(() => {
      const { isAvailable } = useAnimatedHinge();
      renders.push(isAvailable);
    });

    act(() => availabilityHandler!(HINGE_SENSOR_TYPE, true));

    expect(renders).toEqual([false, true]);
    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(1);
  });

  test('ignores the availability of other sensors', () => {
    const renders: boolean[] = [];
    renderHook(() => {
      const { isAvailable } = useAnimatedHinge();
      renders.push(isAvailable);
    });

    act(() => availabilityHandler!(OTHER_SENSOR_TYPE, true));

    expect(renders).toEqual([false]);
  });

  test('shares one native registration between hooks', () => {
    const first = renderHook(() => useAnimatedHinge());
    const second = renderHook(() => useAnimatedHinge());

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(1);
    expect(first.result.current.hinge).toBe(second.result.current.hinge);

    first.unmount();
    expect(ReanimatedModule.unregisterSensor).not.toHaveBeenCalled();

    second.unmount();
    expect(jest.mocked(ReanimatedModule.unregisterSensor).mock.calls).toEqual([
      [1],
    ]);
  });

  test('stops the updates when the user unregisters', () => {
    const { result, rerender, unmount } = renderHook(() => useAnimatedHinge());

    act(() => result.current.unregister());
    expect(ReanimatedModule.unregisterSensor).toHaveBeenCalledTimes(1);

    rerender({});
    act(() => availabilityHandler!(HINGE_SENSOR_TYPE, true));
    unmount();

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(1);
    expect(ReanimatedModule.unregisterSensor).toHaveBeenCalledTimes(1);
  });

  test('asks the platform again on a later mount after a refused registration', () => {
    isRegistrationAccepted = false;
    const early = renderHook(() => useAnimatedHinge());
    early.unmount();

    expect(ReanimatedModule.unregisterSensor).not.toHaveBeenCalled();

    isRegistrationAccepted = true;
    const late = renderHook(() => useAnimatedHinge());
    late.unmount();

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(2);
    expect(jest.mocked(ReanimatedModule.unregisterSensor).mock.calls).toEqual([
      [1],
    ]);
  });

  test('registers again after the last hook unmounted', () => {
    const first = renderHook(() => useAnimatedHinge());
    first.unmount();
    const second = renderHook(() => useAnimatedHinge());
    second.unmount();

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(2);
    expect(jest.mocked(ReanimatedModule.unregisterSensor).mock.calls).toEqual([
      [1],
      [2],
    ]);
  });

  test('unregisters one time for repeated unregister calls and the unmount', () => {
    const { result, unmount } = renderHook(() => useAnimatedHinge());

    act(() => result.current.unregister());
    act(() => result.current.unregister());
    unmount();
    result.current.unregister();

    expect(ReanimatedModule.unregisterSensor).toHaveBeenCalledTimes(1);
  });

  test('renders each mounted hook again when the platform finds the hinge', () => {
    const firstRenders: boolean[] = [];
    const secondRenders: boolean[] = [];
    renderHook(() => {
      firstRenders.push(useAnimatedHinge().isAvailable);
    });
    renderHook(() => {
      secondRenders.push(useAnimatedHinge().isAvailable);
    });

    act(() => availabilityHandler!(HINGE_SENSOR_TYPE, true));

    expect(firstRenders).toEqual([false, true]);
    expect(secondRenders).toEqual([false, true]);
  });

  test('balances the registrations in strict mode', () => {
    const { unmount } = renderHook(() => useAnimatedHinge(), {
      wrapper: StrictMode,
    });

    unmount();

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(2);
    expect(ReanimatedModule.unregisterSensor).toHaveBeenCalledTimes(2);
  });
});
