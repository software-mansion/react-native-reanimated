'use strict';
import { useEffect, useRef } from 'react';
import { initializeSensor, registerSensor, unregisterSensor } from '../core';
import type {
  SensorConfig,
  AnimatedSensor,
  Value3D,
  ValueRotation,
} from '../commonTypes';
import { SensorType, IOSReferenceFrame } from '../commonTypes';
import { callMicrotasks } from '../threads';

// euler angles are in order ZXY, z = yaw, x = pitch, y = roll
// https://github.com/mrdoob/three.js/blob/dev/src/math/Quaternion.js#L237
function eulerToQuaternion(pitch: number, roll: number, yaw: number) {
  'worklet';
  const c1 = Math.cos(pitch / 2);
  const s1 = Math.sin(pitch / 2);
  const c2 = Math.cos(roll / 2);
  const s2 = Math.sin(roll / 2);
  const c3 = Math.cos(yaw / 2);
  const s3 = Math.sin(yaw / 2);

  return [
    s1 * c2 * c3 - c1 * s2 * s3,
    c1 * s2 * c3 + s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    c1 * c2 * c3 - s1 * s2 * s3,
  ];
}

function adjustRotationToInterfaceOrientation(data: ValueRotation) {
  'worklet';
  const { interfaceOrientation, pitch, roll, yaw } = data;
  if (interfaceOrientation === 90) {
    data.pitch = roll;
    data.roll = -pitch;
    data.yaw = yaw - Math.PI / 2;
  } else if (interfaceOrientation === 270) {
    data.pitch = -roll;
    data.roll = pitch;
    data.yaw = yaw + Math.PI / 2;
  } else if (interfaceOrientation === 180) {
    data.pitch *= -1;
    data.roll *= -1;
    data.yaw *= -1;
  }

  const q = eulerToQuaternion(data.pitch, data.roll, data.yaw);
  data.qx = q[0];
  data.qy = q[1];
  data.qz = q[2];
  data.qw = q[3];
  return data;
}

function adjustVectorToInterfaceOrientation(data: Value3D) {
  'worklet';
  const { interfaceOrientation, x, y } = data;
  if (interfaceOrientation === 90) {
    data.x = -y;
    data.y = x;
  } else if (interfaceOrientation === 270) {
    data.x = y;
    data.y = -x;
  } else if (interfaceOrientation === 180) {
    data.x *= -1;
    data.y *= -1;
  }
  return data;
}

/**
 * Lets you create animations based on data from the device's sensors.
 *
 * @param sensorType - Type of the sensor to use. Configured with {@link SensorType} enum.
 * @param config - The sensor configuration - {@link SensorConfig}.
 * @returns An object containing the sensor measurements [shared value](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value) and a function to unregister the sensor
 * @see https://docs.swmansion.com/react-native-reanimated/docs/device/useAnimatedSensor
 */
export function useAnimatedSensor(
  sensorType: SensorType.ROTATION,
  userConfig?: Partial<SensorConfig>
): AnimatedSensor<ValueRotation>;
export function useAnimatedSensor(
  sensorType: Exclude<SensorType, SensorType.ROTATION>,
  userConfig?: Partial<SensorConfig>
): AnimatedSensor<Value3D>;
export function useAnimatedSensor(
  sensorType: SensorType,
  userConfig?: Partial<SensorConfig>
): AnimatedSensor<ValueRotation | Value3D> {
  const config: SensorConfig = {
    interval: 'auto',
    adjustToInterfaceOrientation: true,
    iosReferenceFrame: IOSReferenceFrame.Auto,
    ...userConfig,
  };
  const ref = useRef<AnimatedSensor<Value3D | ValueRotation>>({
    sensor: initializeSensor(sensorType, config),
    unregister: () => {
      // NOOP
    },
    isAvailable: false,
    config: config,
  });

  useEffect(() => {
    const newConfig = {
      ...config,
      ...userConfig,
    };
    ref.current.sensor = initializeSensor(sensorType, newConfig);

    const sensorData = ref.current.sensor;
    const adjustToInterfaceOrientation =
      ref.current.config.adjustToInterfaceOrientation;

    const id = registerSensor(sensorType, config, (data) => {
      'worklet';
      if (adjustToInterfaceOrientation) {
        if (sensorType === SensorType.ROTATION) {
          data = adjustRotationToInterfaceOrientation(data as ValueRotation);
        } else {
          data = adjustVectorToInterfaceOrientation(data as Value3D);
        }
      }
      sensorData.value = data;
      callMicrotasks();
    });

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
