'use strict';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

import type {
  AnimatedSensor,
  SensorConfig,
  Value3D,
  ValueRotation,
} from '../commonTypes';
import {
  InterfaceOrientation,
  IOSReferenceFrame,
  SensorType,
} from '../commonTypes';
import {
  initializeSensor,
  isSensorAvailable,
  registerSensor,
  unregisterSensor,
} from '../core';

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
  if (interfaceOrientation === InterfaceOrientation.ROTATION_90) {
    data.pitch = roll;
    data.roll = -pitch;
    data.yaw = yaw - Math.PI / 2;
  } else if (interfaceOrientation === InterfaceOrientation.ROTATION_270) {
    data.pitch = -roll;
    data.roll = pitch;
    data.yaw = yaw + Math.PI / 2;
  } else if (interfaceOrientation === InterfaceOrientation.ROTATION_180) {
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
  if (interfaceOrientation === InterfaceOrientation.ROTATION_90) {
    data.x = -y;
    data.y = x;
  } else if (interfaceOrientation === InterfaceOrientation.ROTATION_270) {
    data.x = y;
    data.y = -x;
  } else if (interfaceOrientation === InterfaceOrientation.ROTATION_180) {
    data.x *= -1;
    data.y *= -1;
  }
  return data;
}

function adjustDataToInterfaceOrientation(
  sensorType: SensorType,
  data: Value3D | ValueRotation
) {
  'worklet';
  // The sensor type determines the shape of its data.
  return sensorType === SensorType.ROTATION
    ? adjustRotationToInterfaceOrientation(data as ValueRotation)
    : adjustVectorToInterfaceOrientation(data as Value3D);
}

const NOOP = () => {
  // NOOP
};

// The sensors of a device do not change while the app runs, so there is
// nothing to subscribe to.
const subscribeToAvailability = () => NOOP;

// There are no sensors on the server. React uses this value during hydration
// too, so the hydrated markup matches the server markup, and then renders
// again with the value for the device.
const getServerAvailability = () => false;

/**
 * Lets you create animations based on data from the device's sensors.
 *
 * @param sensorType - Type of the sensor to use. Configured with
 *   {@link SensorType} enum.
 * @param config - The sensor configuration - {@link SensorConfig}.
 * @returns An object containing the sensor measurements [shared
 *   value](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value)
 *   and a function to unregister the sensor
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
): AnimatedSensor<ValueRotation> | AnimatedSensor<Value3D> {
  const {
    interval = 'auto',
    adjustToInterfaceOrientation = true,
    iosReferenceFrame = IOSReferenceFrame.Auto,
  } = userConfig ?? {};

  // `userConfig` is usually a new object on every render, so the config
  // depends on its values, not on its identity.
  const config = useMemo<SensorConfig>(
    () => ({ interval, adjustToInterfaceOrientation, iosReferenceFrame }),
    [interval, adjustToInterfaceOrientation, iosReferenceFrame]
  );

  // Ask the platform during render, so that the first render already reports
  // whether the device has the sensor.
  const isAvailable = useSyncExternalStore(
    subscribeToAvailability,
    () => isSensorAvailable(sensorType),
    getServerAvailability
  );

  const sensor = useMemo(
    () => initializeSensor(sensorType, config),
    [sensorType, config]
  );

  const unregisterRef = useRef(NOOP);

  useEffect(() => {
    const id = registerSensor(sensorType, config, (data) => {
      'worklet';
      sensor.value = adjustToInterfaceOrientation
        ? adjustDataToInterfaceOrientation(sensorType, data)
        : data;
    });

    // `unregister` is both the public method and the effect cleanup, so it
    // must release the registration at most once.
    let isRegistered = id !== -1;
    const unregister = () => {
      if (isRegistered) {
        isRegistered = false;
        unregisterSensor(id);
      }
    };
    unregisterRef.current = unregister;

    return unregister;
  }, [sensorType, config, sensor, adjustToInterfaceOrientation]);

  return useMemo(
    () => ({
      sensor,
      isAvailable,
      config,
      unregister: () => unregisterRef.current(),
    }),
    [sensor, isAvailable, config]
  ) as AnimatedSensor<ValueRotation> | AnimatedSensor<Value3D>;
}
