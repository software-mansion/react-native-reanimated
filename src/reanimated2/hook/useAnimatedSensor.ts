import { useEffect, useRef } from 'react';
import { makeMutable, registerSensor, unregisterSensor } from '../core';
import { SharedValue, Value3D, ValueRotation } from '../commonTypes';

export enum SensorType {
  ACCELEROMETER = 1,
  GYROSCOPE = 2,
  GRAVITY = 3,
  MAGNETIC_FIELD = 4,
  ROTATION = 5,
}

export type SensorConfig = {
  interval: number | 'auto';
};

export type AnimatedSensor = {
  sensor: SharedValue<Value3D | ValueRotation>;
  unregister: () => void;
  isAvailable: boolean;
  config: SensorConfig;
};

function initSensorData(
  sensorType: SensorType
): SharedValue<Value3D | ValueRotation> {
  if (sensorType === SensorType.ROTATION) {
    return makeMutable<Value3D | ValueRotation>({
      qw: 0,
      qx: 0,
      qy: 0,
      qz: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
    });
  } else {
    return makeMutable<Value3D | ValueRotation>({
      x: 0,
      y: 0,
      z: 0,
    });
  }
}

export function useAnimatedSensor(
  sensorType: SensorType,
  userConfig?: SensorConfig
): AnimatedSensor {
  const ref = useRef<AnimatedSensor>({
    sensor: initSensorData(sensorType),
    unregister: () => {
      // NOOP
    },
    isAvailable: false,
    config: {
      interval: 0,
    },
  });

  useEffect(() => {
    ref.current.config = { interval: 'auto', ...userConfig };
    const sensorData = ref.current.sensor!;
    const id = registerSensor(
      sensorType,
      ref.current.config.interval === 'auto' ? -1 : ref.current.config.interval,
      (data) => {
        'worklet';
        sensorData.value = data;
      }
    );

    if (id !== -1) {
      // if sensor is available
      ref.current.unregister = () => unregisterSensor(id);
      ref.current.isAvailable = true;
    } else {
      // if sensor is unavailable
      ref.current.unregister = () => {
        // NOOP
      };
      ref.current.isAvailable = false;
    }

    return () => {
      ref.current.unregister();
    };
  }, [sensorType, userConfig]);

  return ref.current;
}
