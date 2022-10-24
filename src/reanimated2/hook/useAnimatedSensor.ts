import { useEffect, useRef } from 'react';
import { makeMutable, registerSensor, unregisterSensor } from '../core';
import { SensorValue3D, SensorValueRotation } from '../commonTypes';

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
  sensor: SensorValue3D | SensorValueRotation | null;
  unregister: () => void;
  isAvailable: boolean;
  config: SensorConfig;
};

export function useAnimatedSensor(
  sensorType: SensorType,
  userConfig?: SensorConfig
): AnimatedSensor {
  const ref = useRef<AnimatedSensor>({
    sensor: null,
    unregister: () => {
      // NOOP
    },
    isAvailable: false,
    config: {
      interval: 0,
    },
  });

  if (ref.current.sensor === null) {
    ref.current.config = { interval: 'auto', ...userConfig };
    let sensorData;
    if (sensorType === SensorType.ROTATION) {
      sensorData = {
        qw: 0,
        qx: 0,
        qy: 0,
        qz: 0,
        yaw: 0,
        pitch: 0,
        roll: 0,
      };
    } else {
      sensorData = {
        x: 0,
        y: 0,
        z: 0,
      };
    }
    ref.current.sensor = makeMutable(sensorData) as any;
  }

  useEffect(() => {
    ref.current.config = { interval: 'auto', ...userConfig };
    const sensorData = ref.current.sensor;
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
