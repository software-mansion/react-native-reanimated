import { SensorType } from '../src';
import { ReanimatedModule } from '../src/ReanimatedModule';
import { createJSReanimatedModule } from '../src/ReanimatedModule/js-reanimated';
import { SensorContainer } from '../src/SensorContainer';

describe('SensorContainer', () => {
  test('asks the platform about each sensor type once', () => {
    const isSensorAvailable = jest
      .spyOn(ReanimatedModule, 'isSensorAvailable')
      .mockImplementation(
        (sensorType) => sensorType === Number(SensorType.ACCELEROMETER)
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
