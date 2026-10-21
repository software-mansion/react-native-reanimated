import { describe, expect, test } from 'tstyche';

import type {
  AnimatedSensor,
  SensorValue,
  SharedValue,
  Value3D,
  ValueRotation,
} from '..';
import { SensorType, useAnimatedSensor } from '..';

describe('useAnimatedSensor', () => {
  test('returns the value of the rotation sensor', () => {
    expect(useAnimatedSensor(SensorType.ROTATION)).type.toBe<
      AnimatedSensor<ValueRotation>
    >();
  });

  test('returns a 3D value for the other sensors', () => {
    expect(useAnimatedSensor(SensorType.ACCELEROMETER)).type.toBe<
      AnimatedSensor<Value3D>
    >();
    expect(useAnimatedSensor(SensorType.GYROSCOPE)).type.toBe<
      AnimatedSensor<Value3D>
    >();
    expect(useAnimatedSensor(SensorType.GRAVITY)).type.toBe<
      AnimatedSensor<Value3D>
    >();
    expect(useAnimatedSensor(SensorType.MAGNETIC_FIELD)).type.toBe<
      AnimatedSensor<Value3D>
    >();
  });

  test('returns every possible value for a sensor type known only at runtime', () => {
    const sensorType = SensorType.GRAVITY as SensorType;

    expect(useAnimatedSensor(sensorType)).type.toBe<
      AnimatedSensor<SensorValue>
    >();
    expect(useAnimatedSensor(sensorType).sensor).type.toBe<
      SharedValue<Value3D | ValueRotation>
    >();
  });

  test('returns every possible value for a union of sensor types', () => {
    const sensorType = SensorType.ROTATION as
      | SensorType.ROTATION
      | SensorType.GRAVITY;

    expect(useAnimatedSensor(sensorType)).type.toBe<
      AnimatedSensor<Value3D | ValueRotation>
    >();
  });

  test('takes an optional partial config', () => {
    expect(useAnimatedSensor).type.toBeCallableWith(SensorType.ROTATION);
    expect(useAnimatedSensor).type.toBeCallableWith(SensorType.ROTATION, {});
    expect(useAnimatedSensor).type.toBeCallableWith(SensorType.GRAVITY, {
      interval: 16,
      adjustToInterfaceOrientation: false,
    });
    expect(useAnimatedSensor).type.toBeCallableWith(SensorType.GRAVITY, {
      interval: 'auto',
    });
    expect(useAnimatedSensor).type.not.toBeCallableWith(SensorType.GRAVITY, {
      interval: '16',
    });
  });

  test('rejects values that are not sensor types', () => {
    expect(useAnimatedSensor).type.not.toBeCallableWith(7);
    expect(useAnimatedSensor).type.not.toBeCallableWith('ROTATION');
  });

  test('makes the value readable in a worklet without narrowing', () => {
    const { sensor } = useAnimatedSensor(SensorType.ROTATION);
    expect(sensor.value.qw).type.toBe<number>();
    expect(sensor.value).type.not.toHaveProperty('x');
  });
});
