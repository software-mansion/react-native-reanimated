import { IOSReferenceFrame, SensorType } from '../src';
import { ReanimatedModule } from '../src/ReanimatedModule';
import { createJSReanimatedModule } from '../src/ReanimatedModule/js-reanimated';
import { SensorContainer } from '../src/SensorContainer';

describe('SensorContainer', () => {
  test('asks the platform about each sensor type once', () => {
    const isSensorAvailable = jest
      .spyOn(ReanimatedModule, 'isSensorAvailable')
      .mockImplementation(
        (sensorType) => sensorType === (SensorType.ACCELEROMETER as number)
      );
    const sensorContainer = new SensorContainer();

    expect(sensorContainer.isSensorAvailable(SensorType.ACCELEROMETER)).toBe(
      true
    );
    expect(sensorContainer.isSensorAvailable(SensorType.GYROSCOPE)).toBe(false);
    expect(sensorContainer.isSensorAvailable(SensorType.ACCELEROMETER)).toBe(
      true
    );
    expect(sensorContainer.isSensorAvailable(SensorType.GYROSCOPE)).toBe(false);

    expect(isSensorAvailable).toHaveBeenCalledTimes(2);
    isSensorAvailable.mockRestore();
  });

  test('registers a separate sensor for each interval', () => {
    let nextNativeId = 0;
    const registerSensor = jest
      .spyOn(ReanimatedModule, 'registerSensor')
      .mockImplementation(() => nextNativeId++);
    const sensorContainer = new SensorContainer();
    const config = {
      adjustToInterfaceOrientation: true,
      iosReferenceFrame: IOSReferenceFrame.Auto,
    };
    const handler = jest.fn() as never;

    const intervals = ['auto', 100, 1000, 100] as const;
    const sharedValues = intervals.map((interval) =>
      sensorContainer.initializeSensor(SensorType.GYROSCOPE, {
        ...config,
        interval,
      })
    );
    const ids = intervals.map((interval) =>
      sensorContainer.registerSensor(
        SensorType.GYROSCOPE,
        { ...config, interval },
        handler
      )
    );

    expect(new Set(ids).size).toBe(3);
    expect(new Set(sharedValues).size).toBe(3);
    expect(sharedValues[3]).toBe(sharedValues[1]);
    expect(
      registerSensor.mock.calls.map(([, interval]) => interval)
    ).toStrictEqual([-1, 100, 1000]);
    registerSensor.mockRestore();
  });
});

describe('JSReanimated', () => {
  afterEach(() => {
    delete (globalThis as { Accelerometer?: unknown }).Accelerometer;
  });

  test('reports a sensor whose Generic Sensor API the browser exposes', () => {
    const module = createJSReanimatedModule();

    expect(module.isSensorAvailable(SensorType.ACCELEROMETER)).toBe(false);

    (globalThis as { Accelerometer?: unknown }).Accelerometer = class {};

    expect(module.isSensorAvailable(SensorType.ACCELEROMETER)).toBe(true);
    expect(module.isSensorAvailable(SensorType.GYROSCOPE)).toBe(false);
  });
});
