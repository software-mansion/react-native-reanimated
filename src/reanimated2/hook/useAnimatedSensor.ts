import { useEffect, useRef } from 'react';
import { makeMutable, registerSensor, unregisterSensor } from '../core';
import {
  SensorType,
  SharedValue,
  Value3D,
  ValueRotation,
  IOSReferenceFrame,
} from '../commonTypes';
import { flushImmediates } from '../threads';

export type SensorConfig = {
  interval: number | 'auto';
  adjustToInterfaceOrientation: boolean;
  iosReferenceFrame: IOSReferenceFrame;
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
      interfaceOrientation: 0,
    });
  } else {
    return makeMutable<Value3D | ValueRotation>({
      x: 0,
      y: 0,
      z: 0,
      interfaceOrientation: 0,
    });
  }
}

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

export function useAnimatedSensor(
  sensorType: SensorType,
  userConfig?: Partial<SensorConfig>
): AnimatedSensor {
  const ref = useRef<AnimatedSensor>({
    sensor: initSensorData(sensorType),
    unregister: () => {
      // NOOP
    },
    isAvailable: false,
    config: {
      interval: 0,
      adjustToInterfaceOrientation: true,
      iosReferenceFrame: IOSReferenceFrame.Auto,
    },
  });

  useEffect(() => {
    ref.current.config = {
      interval: 'auto',
      adjustToInterfaceOrientation: true,
      iosReferenceFrame: IOSReferenceFrame.Auto,
      ...userConfig,
    };
    const sensorData = ref.current.sensor!;
    const id = registerSensor(
      sensorType,
      ref.current.config.interval === 'auto' ? -1 : ref.current.config.interval,
      ref.current.config.iosReferenceFrame,
      (data) => {
        'worklet';
        if (ref.current.config.adjustToInterfaceOrientation) {
          if (sensorType === SensorType.ROTATION) {
            data = adjustRotationToInterfaceOrientation(data as ValueRotation);
          } else {
            data = adjustVectorToInterfaceOrientation(data as Value3D);
          }
        }
        sensorData.value = data;
        flushImmediates();
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
