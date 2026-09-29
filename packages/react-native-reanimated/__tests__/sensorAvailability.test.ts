import { SensorType } from '../src';
import { createJSReanimatedModule } from '../src/ReanimatedModule/js-reanimated';

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

  test('has no hinge sensor', () => {
    const module = createJSReanimatedModule();

    expect(module.isSensorAvailable(SensorType.HINGE)).toBe(false);
    expect(
      module.registerSensor(SensorType.HINGE, -1, 0, jest.fn() as never)
    ).toBe(-1);
  });
});
