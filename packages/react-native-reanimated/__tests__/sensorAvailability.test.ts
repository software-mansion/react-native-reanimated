import { SensorType } from '../src';
import { logger } from '../src/common/logger';
import { createJSReanimatedModule } from '../src/ReanimatedModule/js-reanimated';

describe('JSReanimated', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'warnOnce').mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as { Accelerometer?: unknown }).Accelerometer;
  });

  test('reports a sensor whose Generic Sensor API the browser exposes', () => {
    const module = createJSReanimatedModule();

    expect(module.isSensorAvailable(SensorType.ACCELEROMETER)).toBe(false);

    (globalThis as { Accelerometer?: unknown }).Accelerometer = class {};

    expect(module.isSensorAvailable(SensorType.ACCELEROMETER)).toBe(true);
    expect(module.isSensorAvailable(SensorType.GYROSCOPE)).toBe(false);
  });

  test('warns about a sensor that the browser does not expose', () => {
    const module = createJSReanimatedModule();

    module.isSensorAvailable(SensorType.ACCELEROMETER);

    expect(jest.mocked(logger.warnOnce).mock.calls).toEqual([
      ['Sensor is not available.', 0],
    ]);
  });

  test('does not warn about a sensor that the browser exposes', () => {
    const module = createJSReanimatedModule();
    (globalThis as { Accelerometer?: unknown }).Accelerometer = class {};

    module.isSensorAvailable(SensorType.ACCELEROMETER);

    expect(logger.warnOnce).not.toHaveBeenCalled();
  });

  test('has no hinge sensor and does not warn about it', () => {
    const module = createJSReanimatedModule();

    expect(module.isSensorAvailable(SensorType.HINGE)).toBe(false);
    expect(
      module.registerSensor(SensorType.HINGE, -1, 0, jest.fn() as never)
    ).toBe(-1);
    expect(logger.warnOnce).not.toHaveBeenCalled();
  });
});
