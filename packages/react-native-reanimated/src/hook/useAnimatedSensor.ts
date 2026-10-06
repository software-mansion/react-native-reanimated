'use strict';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import type {
  AnimatedSensor,
  SensorConfig,
  SensorValue,
  SensorValueMap,
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
  subscribeToSensorAvailability,
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
  data: SensorValue
): SensorValue {
  'worklet';
  switch (sensorType) {
    case SensorType.ACCELEROMETER:
    case SensorType.GYROSCOPE:
    case SensorType.GRAVITY:
    case SensorType.MAGNETIC_FIELD:
      return adjustVectorToInterfaceOrientation(data as Value3D);
    case SensorType.ROTATION:
      return adjustRotationToInterfaceOrientation(data as ValueRotation);
    case SensorType.HINGE:
      return data;
  }
}

const NOOP = () => {
  // NOOP
};

const getServerSensorAvailability = () => false;

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
export function useAnimatedSensor<T extends SensorType>(
  sensorType: T,
  userConfig?: T extends SensorType.HINGE ? never : Partial<SensorConfig>
): AnimatedSensor<SensorValueMap[T]> {
  const {
    interval = 'auto',
    adjustToInterfaceOrientation = true,
    iosReferenceFrame = IOSReferenceFrame.Auto,
  } = userConfig ?? {};

  const config = useMemo<SensorConfig>(
    () => ({ interval, adjustToInterfaceOrientation, iosReferenceFrame }),
    [interval, adjustToInterfaceOrientation, iosReferenceFrame]
  );

  const getSensorAvailability = useCallback(
    () => isSensorAvailable(sensorType),
    [sensorType]
  );

  const isAvailable = useSyncExternalStore(
    subscribeToSensorAvailability,
    getSensorAvailability,
    getServerSensorAvailability
  );

  const sensor = useMemo(
    () => initializeSensor(sensorType, config),
    [sensorType, config]
  );

  const registrationRef = useRef({
    sensorType,
    config,
    unregister: NOOP,
    isUnregisteredByUser: false,
  });

  useEffect(() => {
    const previousRegistration = registrationRef.current;
    if (
      previousRegistration.isUnregisteredByUser &&
      previousRegistration.sensorType === sensorType &&
      previousRegistration.config === config
    ) {
      return;
    }

    const id = registerSensor(sensorType, config, (data) => {
      'worklet';
      sensor.value = adjustToInterfaceOrientation
        ? (adjustDataToInterfaceOrientation(
            sensorType,
            data
          ) as SensorValueMap[T])
        : data;
    });

    let isRegistered = id !== -1;
    const unregister = () => {
      if (isRegistered) {
        isRegistered = false;
        unregisterSensor(id);
      }
    };
    registrationRef.current = {
      sensorType,
      config,
      unregister,
      isUnregisteredByUser: false,
    };

    return unregister;
  }, [sensorType, config, sensor, adjustToInterfaceOrientation, isAvailable]);

  return useMemo(
    () => ({
      sensor,
      isAvailable,
      config,
      unregister: () => {
        const registration = registrationRef.current;
        if (
          registration.sensorType === sensorType &&
          registration.config === config
        ) {
          registration.isUnregisteredByUser = true;
          registration.unregister();
        }
      },
    }),
    [sensorType, sensor, isAvailable, config]
  );
}
