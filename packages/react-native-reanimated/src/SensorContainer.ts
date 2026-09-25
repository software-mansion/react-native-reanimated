'use strict';
import type { SerializableRef } from 'react-native-worklets';

import type {
  SensorConfig,
  SensorType,
  SensorValue,
  SensorValueMap,
  SharedValue,
} from './commonTypes';
import Sensor from './Sensor';

export class SensorContainer {
  private nativeSensors: Map<number, Sensor> = new Map();

  getSensorId(sensorType: SensorType, config: SensorConfig) {
    return (
      sensorType * 100 +
      config.iosReferenceFrame * 10 +
      Number(config.adjustToInterfaceOrientation)
    );
  }

  initializeSensor<T extends SensorType>(
    sensorType: T,
    config: SensorConfig
  ): SharedValue<SensorValueMap[T]> {
    const sensorId = this.getSensorId(sensorType, config);

    if (!this.nativeSensors.has(sensorId)) {
      this.nativeSensors.set(
        sensorId,
        new Sensor<SensorType>(sensorType, config)
      );
    }

    const sensor = this.nativeSensors.get(sensorId) as Sensor<T> | undefined;
    return sensor!.getSharedValue();
  }

  registerSensor(
    sensorType: SensorType,
    config: SensorConfig,
    handler: SerializableRef<(data: SensorValue) => void>
  ): number {
    const sensorId = this.getSensorId(sensorType, config);

    if (!this.nativeSensors.has(sensorId)) {
      return -1;
    }

    const sensor = this.nativeSensors.get(sensorId);
    if (
      sensor &&
      sensor.isAvailable() &&
      (sensor.isRunning() || sensor.register(handler))
    ) {
      sensor.listenersNumber++;
      return sensorId;
    }
    return -1;
  }

  unregisterSensor(sensorId: number) {
    if (this.nativeSensors.has(sensorId)) {
      const sensor = this.nativeSensors.get(sensorId);
      if (sensor && sensor.isRunning()) {
        sensor.listenersNumber--;
        if (sensor.listenersNumber === 0) {
          sensor.unregister();
        }
      }
    }
  }
}
