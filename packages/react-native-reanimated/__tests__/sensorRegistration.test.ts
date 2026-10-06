import { act, renderHook } from '@testing-library/react-native';
import { StrictMode } from 'react';

import type { SensorValue } from '../src';
import { HingeStatus, SensorType, useAnimatedSensor } from '../src';
import { ReanimatedModule } from '../src/ReanimatedModule';

describe('Sensor registration', () => {
  let isRegistrationAccepted = true;
  let nextNativeSensorId = 1;
  let nativeHandler: ((data: SensorValue) => void) | undefined;

  beforeEach(() => {
    isRegistrationAccepted = true;
    nextNativeSensorId = 1;
    nativeHandler = undefined;
    jest
      .spyOn(ReanimatedModule, 'registerSensor')
      .mockImplementation(
        (_sensorType, _interval, _iosReferenceFrame, handler) => {
          if (!isRegistrationAccepted) {
            return -1;
          }
          nativeHandler = handler as unknown as (data: SensorValue) => void;
          return nextNativeSensorId++;
        }
      );
    jest.spyOn(ReanimatedModule, 'unregisterSensor').mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as { __sensorContainer?: unknown }).__sensorContainer;
  });

  test('registers on a later mount after a failed registration', () => {
    isRegistrationAccepted = false;
    const early = renderHook(() => useAnimatedSensor(SensorType.HINGE));

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(1);

    isRegistrationAccepted = true;
    const late = renderHook(() => useAnimatedSensor(SensorType.HINGE));

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(2);

    const data = {
      angle: Math.PI / 2,
      status: HingeStatus.PARTIALLY_OPEN,
      interfaceOrientation: 0,
    };
    act(() => nativeHandler!({ ...data }));

    expect(late.result.current.sensor.value).toStrictEqual(data);

    early.unmount();
    expect(ReanimatedModule.unregisterSensor).not.toHaveBeenCalled();

    late.unmount();
    expect(jest.mocked(ReanimatedModule.unregisterSensor).mock.calls).toEqual([
      [1],
    ]);
  });

  test('asks the platform on every mount while it refuses the registration', () => {
    isRegistrationAccepted = false;
    const first = renderHook(() => useAnimatedSensor(SensorType.HINGE));
    const second = renderHook(() => useAnimatedSensor(SensorType.HINGE));

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(2);

    first.unmount();
    second.unmount();

    expect(ReanimatedModule.unregisterSensor).not.toHaveBeenCalled();
  });

  test('shares one registration between the hooks of one sensor', () => {
    const first = renderHook(() => useAnimatedSensor(SensorType.HINGE));
    const second = renderHook(() => useAnimatedSensor(SensorType.HINGE));

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(1);

    first.unmount();
    expect(ReanimatedModule.unregisterSensor).not.toHaveBeenCalled();

    second.unmount();
    expect(jest.mocked(ReanimatedModule.unregisterSensor).mock.calls).toEqual([
      [1],
    ]);
  });

  test('registers again after Strict Mode releases the first registration', () => {
    const { unmount } = renderHook(() => useAnimatedSensor(SensorType.HINGE), {
      wrapper: StrictMode,
    });

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(2);
    expect(jest.mocked(ReanimatedModule.unregisterSensor).mock.calls).toEqual([
      [1],
    ]);

    unmount();

    expect(jest.mocked(ReanimatedModule.unregisterSensor).mock.calls).toEqual([
      [1],
      [2],
    ]);
  });
});
