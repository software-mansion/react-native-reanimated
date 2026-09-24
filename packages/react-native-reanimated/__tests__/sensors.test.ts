import { act, renderHook } from '@testing-library/react-native';
import { StrictMode } from 'react';

import type { SensorConfig, Value3D, ValueRotation } from '../src';
import { IOSReferenceFrame, SensorType, useAnimatedSensor } from '../src';
import { registerSensor, unregisterSensor } from '../src/core';

let eventHandler: (data: Value3D | ValueRotation) => void;
let mockNextSensorId = 1;
const mockUnavailableSensorType = SensorType.GYROSCOPE;

jest.mock('../src/core', () => {
  const originalModule = jest.requireActual('../src/core');

  return {
    __esModule: true,
    ...originalModule,
    isSensorAvailable: (sensorType: SensorType) =>
      sensorType !== mockUnavailableSensorType,
    registerSensor: jest.fn(
      (
        sensorType: SensorType,
        config: SensorConfig,
        _eventHandler: (data: Value3D | ValueRotation) => void
      ) => {
        eventHandler = _eventHandler;
        return sensorType === mockUnavailableSensorType
          ? -1
          : mockNextSensorId++;
      }
    ),
    unregisterSensor: jest.fn(),
  };
});

type SensorResult = ReturnType<typeof useAnimatedSensor>;

function renderSensorHook<Props>(
  useSensor: (props: Props) => SensorResult,
  options?: { initialProps?: Props; wrapper?: typeof StrictMode }
) {
  const renders: SensorResult[] = [];
  const hook = renderHook((props: Props) => {
    const result = useSensor(props);
    renders.push(result);
    return result;
  }, options);
  return { ...hook, renders };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeEqualRounded(data: Value3D | ValueRotation): R;
    }
  }
}

expect.extend({
  toBeEqualRounded(received, data) {
    const ok = Object.keys(data).every(
      (key) => received[key].toFixed(2) === data[key].toFixed(2)
    );

    return ok
      ? {
          pass: true,
          message: () => ``,
        }
      : {
          pass: false,
          message: () =>
            Object.keys(data)
              .map(
                (k) =>
                  `Received [${k}] = ${received[k].toFixed(2)} expected: ${data[
                    k
                  ].toFixed(2)}`
              )
              .join('\n'),
        };
  },
});

describe('Sensors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNextSensorId = 1;
  });

  test('returns rotation sensors', () => {
    const { result } = renderHook(() =>
      useAnimatedSensor(SensorType.ROTATION, {
        adjustToInterfaceOrientation: false,
      })
    );

    const data = {
      qw: 0,
      qx: 1,
      qy: 2,
      qz: 3,
      yaw: 4,
      pitch: 5,
      roll: 6,
      interfaceOrientation: 90,
    };

    act(() => eventHandler({ ...data }));

    expect(result.current.sensor.value).toStrictEqual(data);
  });

  test('returns 3d sensor', () => {
    const { result } = renderHook(() =>
      useAnimatedSensor(SensorType.ACCELEROMETER, {
        adjustToInterfaceOrientation: false,
      })
    );

    const data = {
      x: 1,
      y: 2,
      z: 3,
      interfaceOrientation: 180,
    };

    act(() => eventHandler({ ...data }));

    expect(result.current.sensor.value).toStrictEqual(data);
  });

  // a handy calculator: https://www.andre-gaschler.com/rotationconverter/
  test('adjusts orientation of the rotation sensor', () => {
    const { result } = renderHook(() =>
      useAnimatedSensor(SensorType.ROTATION, {
        adjustToInterfaceOrientation: true,
      })
    );

    // yaw = 60deg, pitch = 30deg, roll=45deg
    const data = {
      qx: 0.02226,
      qy: 0.4396797,
      qz: 0.5319757,
      qw: 0.7233174,
      yaw: 1.0471976,
      pitch: 0.5235988,
      roll: 0.7853982,
      interfaceOrientation: 0,
    };

    // portrait orientation
    act(() => eventHandler({ ...data }));

    const data0 = {
      qx: 0.02226,
      qy: 0.4396797,
      qz: 0.5319757,
      qw: 0.7233174,
      yaw: 1.0471976,
      pitch: 0.5235988,
      roll: 0.7853982,
      interfaceOrientation: 0,
    };

    expect(result.current.sensor.value).toBeEqualRounded(data0);

    // landscape left orientation
    data.interfaceOrientation = 90;
    act(() => eventHandler({ ...data }));

    const data90 = {
      qx: 0.2951603,
      qy: -0.3266407,
      qz: -0.3266407,
      qw: 0.8363564,
      yaw: -0.523,
      pitch: 0.785,
      roll: -0.523,
      interfaceOrientation: 90,
    };

    expect(result.current.sensor.value).toBeEqualRounded(data90);

    // upside down
    data.interfaceOrientation = 180;
    act(() => eventHandler({ ...data }));
    const data180 = {
      qx: -0.3919038,
      qy: -0.2005621,
      qz: -0.3604234,
      qw: 0.8223632,
      yaw: -1.0471976,
      pitch: -0.5235988,
      roll: -0.7853982,
      interfaceOrientation: 180,
    };

    expect(result.current.sensor.value).toBeEqualRounded(data180);

    // landscape right orientation
    data.interfaceOrientation = 270;
    act(() => eventHandler({ ...data }));

    const data270 = {
      qx: -0.3266407,
      qy: -0.2951603,
      qz: 0.8363564,
      qw: 0.3266407,
      yaw: 2.6179939,
      pitch: -0.7853981,
      roll: 0.5235988,
      interfaceOrientation: 270,
    };

    expect(result.current.sensor.value).toBeEqualRounded(data270);
  });

  test('adjusts orientation of the 3d sensor', () => {
    const { result } = renderHook(() =>
      useAnimatedSensor(SensorType.ACCELEROMETER, {
        adjustToInterfaceOrientation: true,
      })
    );

    const data = {
      x: 1,
      y: 2,
      z: 3,
      interfaceOrientation: 0,
    };

    // portrait orientation
    act(() => eventHandler({ ...data }));

    const data0 = {
      x: 1,
      y: 2,
      z: 3,
      interfaceOrientation: 0,
    };

    expect(result.current.sensor.value).toStrictEqual(data0);

    // landscape orientation
    data.interfaceOrientation = 90;
    act(() => eventHandler({ ...data }));

    const data90 = {
      x: -2,
      y: 1,
      z: 3,
      interfaceOrientation: 90,
    };

    expect(result.current.sensor.value).toStrictEqual(data90);

    // upside down
    data.interfaceOrientation = 180;
    act(() => eventHandler({ ...data }));

    const data180 = {
      x: -1,
      y: -2,
      z: 3,
      interfaceOrientation: 180,
    };

    expect(result.current.sensor.value).toStrictEqual(data180);

    // landscape orientation
    data.interfaceOrientation = 270;
    act(() => eventHandler({ ...data }));

    const data270 = {
      x: 2,
      y: -1,
      z: 3,
      interfaceOrientation: 270,
    };

    expect(result.current.sensor.value).toStrictEqual(data270);
  });

  test('reports availability on the first render', () => {
    const available = renderSensorHook(() =>
      useAnimatedSensor(SensorType.ACCELEROMETER)
    );
    const unavailable = renderSensorHook(() =>
      useAnimatedSensor(mockUnavailableSensorType)
    );

    expect(available.renders.map((result) => result.isAvailable)).toEqual([
      true,
    ]);
    expect(unavailable.renders.map((result) => result.isAvailable)).toEqual([
      false,
    ]);
  });

  test('reports availability in the render that changes the sensor type', () => {
    const { renders, rerender } = renderSensorHook(
      (sensorType: Exclude<SensorType, SensorType.ROTATION>) =>
        useAnimatedSensor(sensorType),
      { initialProps: SensorType.ACCELEROMETER }
    );

    rerender(mockUnavailableSensorType);
    rerender(SensorType.ACCELEROMETER);

    expect(renders.map((result) => result.isAvailable)).toEqual([
      true,
      false,
      true,
    ]);
  });

  test('keeps one registration and one result across renders with a new config object', () => {
    const { renders, rerender } = renderSensorHook(() =>
      useAnimatedSensor(SensorType.ACCELEROMETER, { interval: 100 })
    );

    rerender(undefined);
    rerender(undefined);

    expect(renders).toHaveLength(3);
    expect(renders[1]).toBe(renders[0]);
    expect(renders[2]).toBe(renders[0]);
    expect(registerSensor).toHaveBeenCalledTimes(1);
    expect(unregisterSensor).not.toHaveBeenCalled();
  });

  test('registers again after a change of config', () => {
    const { result, rerender } = renderHook(
      (interval: number) =>
        useAnimatedSensor(SensorType.ACCELEROMETER, { interval }),
      { initialProps: 100 }
    );

    rerender(200);

    expect(registerSensor).toHaveBeenCalledTimes(2);
    expect(jest.mocked(registerSensor).mock.calls[1][1]).toEqual({
      interval: 200,
      adjustToInterfaceOrientation: true,
      iosReferenceFrame: IOSReferenceFrame.Auto,
    });
    expect(jest.mocked(unregisterSensor).mock.calls).toEqual([[1]]);
    expect(result.current.config.interval).toBe(200);
  });

  test('does not unregister an unavailable sensor', () => {
    const { result, unmount } = renderHook(() =>
      useAnimatedSensor(mockUnavailableSensorType)
    );

    result.current.unregister();
    unmount();

    expect(unregisterSensor).not.toHaveBeenCalled();
  });

  test('unregisters once after a manual unregister and an unmount', () => {
    const { result, rerender, unmount } = renderHook(() =>
      useAnimatedSensor(SensorType.ACCELEROMETER)
    );
    rerender(undefined);

    result.current.unregister();
    unmount();

    expect(jest.mocked(unregisterSensor).mock.calls).toEqual([[1]]);
  });

  test('releases every registration under Strict Mode', () => {
    const { result, unmount } = renderHook(
      () => useAnimatedSensor(SensorType.ACCELEROMETER),
      { wrapper: StrictMode }
    );

    expect(registerSensor).toHaveBeenCalledTimes(2);
    expect(jest.mocked(unregisterSensor).mock.calls).toEqual([[1]]);

    result.current.unregister();
    unmount();

    expect(jest.mocked(unregisterSensor).mock.calls).toEqual([[1], [2]]);
  });

  test('unregisters the current registration after a change of sensor type', () => {
    const { result, rerender } = renderHook(
      (sensorType: Exclude<SensorType, SensorType.ROTATION>) =>
        useAnimatedSensor(sensorType),
      { initialProps: SensorType.ACCELEROMETER }
    );

    rerender(SensorType.GRAVITY);
    expect(jest.mocked(unregisterSensor).mock.calls).toEqual([[1]]);

    result.current.unregister();

    expect(jest.mocked(unregisterSensor).mock.calls).toEqual([[1], [2]]);
  });
});
