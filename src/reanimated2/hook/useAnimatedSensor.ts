import { useEffect, useRef } from 'react';
import { registerSensor, unregisterSensor } from '../core';
import {
  SensorType,
  IOSReferenceFrame,
  SensorConfig,
  AnimatedSensor,
} from '../commonTypes';
import { initSensorData } from '../sensorUtils';

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
    const id = registerSensor(sensorType, ref);

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
