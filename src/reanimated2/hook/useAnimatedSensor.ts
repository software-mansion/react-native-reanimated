import { useEffect, useRef } from 'react';
import { makeMutable } from '../core';
import { SharedValue } from '../commonTypes';
import NativeReanimated from '../NativeReanimated';

export enum SensorType {
  ACCELEROMETER = 1,
  GYROSCOPE = 2,
  GRAVITY = 3,
  MAGNETIC = 4,
  ROTATION = 5,
}

export type SensorConfig = {
  interval: number;
};

export type AnimatedSensor = {
  sensor: SensorValue3D | SensorValueRotation;
  unregister: () => void;
  isAvailable: boolean;
  config: {
    interval: number;
  };
};

export type SensorValue3D = SharedValue<{
  x: number;
  y: number;
  z: number;
}>;

export type SensorValueRotation = SharedValue<{
  qw: number;
  qx: number;
  qy: number;
  qz: number;
  yaw: number;
  pitch: number;
  roll: number;
}>;

export function useAnimatedSensor(
  sensorType: SensorType,
  userConfig?: SensorConfig
): AnimatedSensor {
  const ref = useRef({
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
    ref.current.config = Object.assign({ interval: 10 }, userConfig);
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
    ref.current.sensor = makeMutable(sensorData);
  }

  useEffect(() => {
    ref.current.config = Object.assign({ interval: 10 }, userConfig);
    const id = NativeReanimated.registerSensor(
      sensorType,
      ref.current.config.interval,
      ref.current.sensor
    );

    if (id !== -1) {
      // if sensor is available
      ref.current.unregister = () => NativeReanimated.unregisterSensor(id);
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
