import { renderHook, act } from '@testing-library/react-hooks';
import { SensorType, useAnimatedSensor, Value3D, ValueRotation } from '../src/';

let eventHandler: (
  data: Value3D | ValueRotation,
  orientationDegrees: number
) => void;

jest.mock('../src/reanimated2/core', () => {
  const originalModule = jest.requireActual('../src/reanimated2/core');

  return {
    __esModule: true,
    ...originalModule,
    registerSensor: (
      sensorType: number,
      interval: number,
      iosReferenceFrame: number,
      _eventHandler: (
        data: Value3D | ValueRotation,
        orientationDegrees: number
      ) => void
    ) => {
      eventHandler = _eventHandler;
    },
  };
});

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
  it('returns rotation sensors', () => {
    const { result } = renderHook(() => useAnimatedSensor(SensorType.ROTATION));

    const data = {
      qw: 0,
      qx: 1,
      qy: 2,
      qz: 3,
      yaw: 4,
      pitch: 5,
      roll: 6,
    };

    eventHandler(data, 90);

    expect(result.current.sensor.value).toBe(data);
    expect(result.current.interfaceOrientation.value).toBe(90);
  });

  it('returns 3d sensor', () => {
    const { result } = renderHook(() =>
      useAnimatedSensor(SensorType.ACCELEROMETER)
    );

    const data = {
      x: 1,
      y: 2,
      z: 3,
    };

    eventHandler(data, 180);

    expect(result.current.sensor.value).toBe(data);
    expect(result.current.interfaceOrientation.value).toBe(180);
  });

  // a handy calculator: https://www.andre-gaschler.com/rotationconverter/
  it('adjusts orientation of the rotation sensor', () => {
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
    };

    // portrait orientation
    act(() => eventHandler({ ...data }, 0));

    const data0 = {
      qx: 0.02226,
      qy: 0.4396797,
      qz: 0.5319757,
      qw: 0.7233174,
      yaw: 1.0471976,
      pitch: 0.5235988,
      roll: 0.7853982,
    };

    expect(result.current.sensor.value).toBeEqualRounded(data0);
    expect(result.current.interfaceOrientation.value).toBe(0);

    // landscape left orientation
    act(() => eventHandler({ ...data }, 90));

    const data90 = {
      qx: 0.2951603,
      qy: -0.3266407,
      qz: -0.3266407,
      qw: 0.8363564,
      yaw: -0.523,
      pitch: 0.785,
      roll: -0.523,
    };

    expect(result.current.sensor.value).toBeEqualRounded(data90);
    expect(result.current.interfaceOrientation.value).toBe(90);

    // upside down
    act(() => eventHandler({ ...data }, 180));

    const data180 = {
      qx: -0.3919038,
      qy: -0.2005621,
      qz: -0.3604234,
      qw: 0.8223632,
      yaw: -1.0471976,
      pitch: -0.5235988,
      roll: -0.7853982,
    };

    expect(result.current.sensor.value).toBeEqualRounded(data180);
    expect(result.current.interfaceOrientation.value).toBe(180);

    // landscape right orientation
    eventHandler(data, 270);

    const data270 = {
      qx: -0.3266407,
      qy: -0.2951603,
      qz: 0.8363564,
      qw: 0.3266407,
      yaw: 2.6179939,
      pitch: -0.7853981,
      roll: 0.5235988,
    };

    expect(result.current.sensor.value).toBeEqualRounded(data270);
    expect(result.current.interfaceOrientation.value).toBe(270);
  });

  it('adjusts orientation of the 3d sensor', () => {
    const { result } = renderHook(() =>
      useAnimatedSensor(SensorType.ACCELEROMETER, {
        adjustToInterfaceOrientation: true,
      })
    );

    const data = {
      x: 1,
      y: 2,
      z: 3,
    };

    // portrait orientation
    act(() => eventHandler({ ...data }, 0));

    const data0 = {
      x: 1,
      y: 2,
      z: 3,
    };

    expect(result.current.sensor.value).toStrictEqual(data0);
    expect(result.current.interfaceOrientation.value).toBe(0);

    // landscape orientation
    act(() => eventHandler({ ...data }, 90));

    const data90 = {
      x: -2,
      y: 1,
      z: 3,
    };

    expect(result.current.sensor.value).toStrictEqual(data90);
    expect(result.current.interfaceOrientation.value).toBe(90);

    // upside down
    act(() => eventHandler({ ...data }, 180));

    const data180 = {
      x: -1,
      y: -2,
      z: 3,
    };

    expect(result.current.sensor.value).toStrictEqual(data180);
    expect(result.current.interfaceOrientation.value).toBe(180);

    // landscape orientation
    eventHandler(data, 270);

    const data270 = {
      x: 2,
      y: -1,
      z: 3,
    };

    expect(result.current.sensor.value).toStrictEqual(data270);
    expect(result.current.interfaceOrientation.value).toBe(270);
  });
});
