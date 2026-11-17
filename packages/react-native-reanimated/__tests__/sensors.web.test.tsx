import { act, render } from '@testing-library/react';

import type { AnimatedSensor, Value3D } from '../src';
import { SensorType, useAnimatedSensor } from '../src';

type SensorConfig = { frequency?: number; referenceFrame?: string };

class FakeAccelerometer {
  static instances: FakeAccelerometer[] = [];

  x = 0;
  y = 0;
  z = 0;
  quaternion: [number, number, number, number] = [0, 0, 0, 0];
  started = false;
  stopped = false;
  listeners: (() => void)[] = [];

  constructor(public config: SensorConfig) {
    FakeAccelerometer.instances.push(this);
  }

  addEventListener(eventType: string, listener: () => void) {
    if (eventType === 'reading') {
      this.listeners.push(listener);
    }
  }

  start() {
    this.started = true;
  }

  stop() {
    this.stopped = true;
  }

  emit(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.listeners.forEach((listener) => listener());
  }
}

describe('useAnimatedSensor on web', () => {
  let result: AnimatedSensor<Value3D> | undefined;

  function SensorConsumer({ interval }: { interval?: number }) {
    result = useAnimatedSensor(SensorType.ACCELEROMETER, { interval });
    return null;
  }

  beforeEach(() => {
    result = undefined;
    FakeAccelerometer.instances = [];
    globalThis.__sensorContainer = undefined;
    (window as unknown as Record<string, unknown>).Accelerometer =
      FakeAccelerometer;
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).Accelerometer;
    globalThis.__sensorContainer = undefined;
  });

  test('starts the browser sensor with the requested frequency', () => {
    render(<SensorConsumer interval={20} />);

    expect(result?.isAvailable).toBe(true);
    expect(FakeAccelerometer.instances).toHaveLength(1);
    expect(FakeAccelerometer.instances[0].config).toEqual({ frequency: 50 });
    expect(FakeAccelerometer.instances[0].started).toBe(true);
  });

  test('writes browser readings to the sensor shared value', () => {
    render(<SensorConsumer />);

    act(() => {
      FakeAccelerometer.instances[0].emit(1, 2, 3);
    });

    expect(result?.sensor.value).toEqual({
      x: 1,
      y: 2,
      z: 3,
      interfaceOrientation: 0,
    });
  });

  test('stops the browser sensor on unmount', () => {
    const { unmount } = render(<SensorConsumer />);
    const sensor = FakeAccelerometer.instances[0];

    unmount();

    expect(sensor.stopped).toBe(true);
  });

  test('stops the browser sensor on manual unregister', () => {
    render(<SensorConsumer />);
    const sensor = FakeAccelerometer.instances[0];

    act(() => {
      result?.unregister();
    });

    expect(sensor.stopped).toBe(true);
  });

  test('reports an unavailable sensor when the browser has no sensor API', () => {
    delete (window as unknown as Record<string, unknown>).Accelerometer;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    render(<SensorConsumer />);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Sensor is not available.')
    );
    warnSpy.mockRestore();
    expect(result?.isAvailable).toBe(false);
    expect(result?.sensor.value).toEqual({
      x: 0,
      y: 0,
      z: 0,
      interfaceOrientation: 0,
    });
  });
});
