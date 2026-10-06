import { act, renderHook } from '@testing-library/react-native';
import { StrictMode } from 'react';

import type { SensorValue } from '../src';
import { HingeStatus, SensorType, useAnimatedSensor } from '../src';
import { ReanimatedModule } from '../src/ReanimatedModule';

const HINGE: number = SensorType.HINGE;

function resetSensorContainer() {
  delete (globalThis as { __sensorContainer?: unknown }).__sensorContainer;
}

describe('Sensor registration', () => {
  let isRegistrationAccepted = true;
  let nextNativeSensorId = 1;
  let nativeHandler: ((data: SensorValue) => void) | undefined;

  beforeEach(() => {
    resetSensorContainer();
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

describe('Sensor availability', () => {
  let isHingeAvailable = false;
  let nextNativeSensorId = 1;
  let availabilityHandler:
    | ((sensorType: number, isAvailable: boolean) => void)
    | undefined;
  let nativeHandler: ((data: SensorValue) => void) | undefined;

  function renderAvailability(
    sensorType: SensorType,
    wrapper?: typeof StrictMode
  ) {
    const renders: boolean[] = [];
    const hook = renderHook(
      () => {
        const result = useAnimatedSensor(sensorType);
        renders.push(result.isAvailable);
        return result;
      },
      { wrapper }
    );
    return { ...hook, renders };
  }

  beforeEach(() => {
    resetSensorContainer();
    isHingeAvailable = false;
    nextNativeSensorId = 1;
    availabilityHandler = undefined;
    nativeHandler = undefined;
    jest
      .spyOn(ReanimatedModule, 'isSensorAvailable')
      .mockImplementation((sensorType) =>
        sensorType === HINGE ? isHingeAvailable : true
      );
    jest
      .spyOn(ReanimatedModule, 'setSensorAvailabilityHandler')
      .mockImplementation((handler) => {
        availabilityHandler = handler;
      });
    jest
      .spyOn(ReanimatedModule, 'registerSensor')
      .mockImplementation(
        (sensorType, _interval, _iosReferenceFrame, handler) => {
          if (sensorType === HINGE && !isHingeAvailable) {
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
  });

  test('asks the platform one time for each sensor type', () => {
    const accelerometer = renderAvailability(SensorType.ACCELEROMETER);
    accelerometer.rerender(undefined);
    renderAvailability(SensorType.ACCELEROMETER);
    const hinge = renderAvailability(SensorType.HINGE);
    hinge.rerender(undefined);
    renderAvailability(SensorType.HINGE);

    expect(accelerometer.renders).toEqual([true, true]);
    expect(hinge.renders).toEqual([false, false]);
    expect(jest.mocked(ReanimatedModule.isSensorAvailable).mock.calls).toEqual([
      [SensorType.ACCELEROMETER],
      [SensorType.HINGE],
    ]);
  });

  test('asks the platform one time under Strict Mode', () => {
    renderAvailability(SensorType.HINGE, StrictMode);

    expect(ReanimatedModule.isSensorAvailable).toHaveBeenCalledTimes(1);
  });

  test('renders every subscribed hook again when the platform reports the sensor', () => {
    const first = renderAvailability(SensorType.HINGE);
    const second = renderAvailability(SensorType.HINGE);

    isHingeAvailable = true;
    act(() => availabilityHandler!(SensorType.HINGE, true));

    expect(first.renders).toEqual([false, true]);
    expect(second.renders).toEqual([false, true]);
    expect(ReanimatedModule.isSensorAvailable).toHaveBeenCalledTimes(1);
  });

  test('does not render again after a report that repeats the cached answer', () => {
    const { renders } = renderAvailability(SensorType.HINGE);

    act(() => availabilityHandler!(SensorType.HINGE, false));

    expect(renders).toEqual([false]);
  });

  test('does not render an unmounted hook when the platform reports the sensor', () => {
    const { renders, unmount } = renderAvailability(SensorType.HINGE);
    unmount();

    isHingeAvailable = true;
    act(() => availabilityHandler!(SensorType.HINGE, true));

    expect(renders).toEqual([false]);
  });

  test('uses the reported answer for a hook that mounts later', () => {
    renderAvailability(SensorType.HINGE).unmount();

    isHingeAvailable = true;
    act(() => availabilityHandler!(SensorType.HINGE, true));
    const { renders } = renderAvailability(SensorType.HINGE);

    expect(renders).toEqual([true]);
    expect(ReanimatedModule.isSensorAvailable).toHaveBeenCalledTimes(1);
  });

  test('uses an answer that the platform reports before the first question', () => {
    renderAvailability(SensorType.ACCELEROMETER);

    act(() => availabilityHandler!(SensorType.HINGE, true));
    const { renders } = renderAvailability(SensorType.HINGE);

    expect(renders).toEqual([true]);
    expect(jest.mocked(ReanimatedModule.isSensorAvailable).mock.calls).toEqual([
      [SensorType.ACCELEROMETER],
    ]);
  });

  test('installs the availability handler before the first question to the platform', () => {
    renderAvailability(SensorType.HINGE);

    const [installOrder] = jest.mocked(
      ReanimatedModule.setSensorAvailabilityHandler
    ).mock.invocationCallOrder;
    const [questionOrder] = jest.mocked(ReanimatedModule.isSensorAvailable).mock
      .invocationCallOrder;

    expect(installOrder).toBeLessThan(questionOrder);
  });

  test('registers again when the platform reports the sensor', () => {
    const { result, unmount } = renderAvailability(SensorType.HINGE);

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(1);

    isHingeAvailable = true;
    act(() => availabilityHandler!(SensorType.HINGE, true));

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(2);

    const data = {
      angle: Math.PI / 2,
      status: HingeStatus.PARTIALLY_OPEN,
      interfaceOrientation: 0,
    };
    act(() => nativeHandler!({ ...data }));

    expect(result.current.sensor.value).toStrictEqual(data);

    unmount();

    expect(jest.mocked(ReanimatedModule.unregisterSensor).mock.calls).toEqual([
      [1],
    ]);
  });

  test('keeps the registration of a sensor whose availability did not change', () => {
    const { renders } = renderAvailability(SensorType.ACCELEROMETER);

    act(() => availabilityHandler!(SensorType.HINGE, true));

    expect(renders).toEqual([true]);
    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(1);
    expect(ReanimatedModule.unregisterSensor).not.toHaveBeenCalled();
  });

  test('does not register again after the user unregistered a refused sensor', () => {
    const { result, renders } = renderAvailability(SensorType.HINGE);

    result.current.unregister();
    isHingeAvailable = true;
    act(() => availabilityHandler!(SensorType.HINGE, true));

    expect(renders).toEqual([false, true]);
    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(1);
  });

  test('does not register again after the user unregistered under Strict Mode', () => {
    const { result } = renderAvailability(SensorType.HINGE, StrictMode);

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(2);

    result.current.unregister();
    isHingeAvailable = true;
    act(() => availabilityHandler!(SensorType.HINGE, true));

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(2);
  });

  test('registers again under Strict Mode when the platform reports the sensor', () => {
    const { unmount } = renderAvailability(SensorType.HINGE, StrictMode);

    isHingeAvailable = true;
    act(() => availabilityHandler!(SensorType.HINGE, true));
    unmount();

    expect(jest.mocked(ReanimatedModule.unregisterSensor).mock.calls).toEqual([
      [1],
    ]);
  });

  test('registers a new sensor type after the user unregistered and the platform reported the sensor', () => {
    const { result, rerender, unmount } = renderHook(
      (sensorType: SensorType) => useAnimatedSensor(sensorType),
      { initialProps: SensorType.HINGE }
    );

    result.current.unregister();
    isHingeAvailable = true;
    act(() => availabilityHandler!(SensorType.HINGE, true));
    rerender(SensorType.ACCELEROMETER);

    expect(
      jest
        .mocked(ReanimatedModule.registerSensor)
        .mock.calls.map(([sensorType]) => sensorType)
    ).toEqual([SensorType.HINGE, SensorType.ACCELEROMETER]);

    unmount();

    expect(jest.mocked(ReanimatedModule.unregisterSensor).mock.calls).toEqual([
      [1],
    ]);
  });

  test('registers again after the user unregistered and the config changed', () => {
    const { result, rerender, unmount } = renderHook(
      (interval: number) =>
        useAnimatedSensor(SensorType.ACCELEROMETER, { interval }),
      { initialProps: 100 }
    );

    result.current.unregister();
    act(() => availabilityHandler!(SensorType.ACCELEROMETER, false));

    expect(result.current.isAvailable).toBe(false);
    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(1);
    expect(jest.mocked(ReanimatedModule.unregisterSensor).mock.calls).toEqual([
      [1],
    ]);

    rerender(200);

    expect(ReanimatedModule.registerSensor).toHaveBeenCalledTimes(2);

    unmount();

    expect(jest.mocked(ReanimatedModule.unregisterSensor).mock.calls).toEqual([
      [1],
      [2],
    ]);
  });

  test('registers the first sensor type again after the user unregistered it and the type changed back', () => {
    const { result, rerender } = renderHook(
      (sensorType: SensorType) => useAnimatedSensor(sensorType),
      { initialProps: SensorType.ACCELEROMETER }
    );

    result.current.unregister();
    rerender(SensorType.GRAVITY);
    rerender(SensorType.ACCELEROMETER);

    expect(
      jest
        .mocked(ReanimatedModule.registerSensor)
        .mock.calls.map(([sensorType]) => sensorType)
    ).toEqual([
      SensorType.ACCELEROMETER,
      SensorType.GRAVITY,
      SensorType.ACCELEROMETER,
    ]);
    expect(jest.mocked(ReanimatedModule.unregisterSensor).mock.calls).toEqual([
      [1],
      [2],
    ]);
  });

  test('unregisters the current registration through a result from before the report', () => {
    const { result } = renderAvailability(SensorType.HINGE);
    const earlyResult = result.current;

    isHingeAvailable = true;
    act(() => availabilityHandler!(SensorType.HINGE, true));
    earlyResult.unregister();

    expect(jest.mocked(ReanimatedModule.unregisterSensor).mock.calls).toEqual([
      [1],
    ]);
  });

  test('ignores unregister on a stale result when the platform reports the sensor', () => {
    const { result, rerender } = renderHook(
      (sensorType: SensorType) => useAnimatedSensor(sensorType),
      { initialProps: SensorType.ACCELEROMETER }
    );
    const stale = result.current;

    rerender(SensorType.HINGE);
    stale.unregister();
    isHingeAvailable = true;
    act(() => availabilityHandler!(SensorType.HINGE, true));

    expect(
      jest
        .mocked(ReanimatedModule.registerSensor)
        .mock.calls.map(([sensorType]) => sensorType)
    ).toEqual([SensorType.ACCELEROMETER, SensorType.HINGE, SensorType.HINGE]);
  });
});
