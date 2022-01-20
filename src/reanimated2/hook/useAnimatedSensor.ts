// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useRef } from 'react';
import { makeMutable } from '../core';
import NativeReanimated from '../NativeReanimated';

export enum SensorType {
  ACCELEROMETER = 1,
  GYROSCOPE,
  GRAVITY,
  MAGNETIC_FIELD,
  ROTATION_VECTOR,
}

export type SensorConfig = {
  interval: number;
};

export type AnimatedSensor = {
  sensor: SensorValue3D | SensorValueRotation;
  reject: () => void;
};

export type SensorValue3D = {
  x: number;
  y: number;
  z: number;
};

export type SensorValueRotation = {
  qw: number;
  qx: number;
  qy: number;
  qz: number;
  yaw: number;
  pitch: number;
  roll: number;
};

export function useAnimatedSensor(
  sensorType: SensorType,
  userConfig?: SensorConfig
): AnimatedSensor {
  const ref = useRef(null);

  if (ref.current === null) {
    const config: SensorConfig = Object.assign({ interval: 50 }, userConfig);
    let sensorData: SensorValue3D | SensorValueRotation;
    if (sensorType !== SensorType.ROTATION_VECTOR) {
      sensorData = {
        x: makeMutable(0),
        y: makeMutable(0),
        z: makeMutable(0),
      };
    } else {
      sensorData = {
        qw: makeMutable(0),
        qx: makeMutable(0),
        qy: makeMutable(0),
        qz: makeMutable(0),
        yaw: makeMutable(0),
        pitch: makeMutable(0),
        roll: makeMutable(0),
      };
    }

    const id = NativeReanimated.registerSensor(
      sensorType,
      config.interval,
      sensorData
    );
    const animatedSensor: AnimatedSensor = {
      sensor: sensorData,
      unregister: () => NativeReanimated.unregisterSensor(id),
    };
    ref.current = animatedSensor;
    console.log('ID:', id);
  }

  useEffect(() => {
    return () => {
      ref.current.reject();
    };
  }, []);

  return ref.current;
}
