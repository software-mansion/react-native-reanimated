'use strict';
import type { SerializableRef } from 'react-native-worklets';

import type {
  SensorConfig,
  SensorType,
  SensorValue,
  SensorValueMap,
  SharedValue,
} from './commonTypes';
import { ReanimatedModule } from './ReanimatedModule';
import Sensor from './Sensor';

export class SensorContainer {
  private nativeSensors: Map<number, Sensor> = new Map();
  private availability: Map<SensorType, boolean> = new Map();
  private availabilityListeners: Set<() => void> = new Set();

  constructor() {
    ReanimatedModule.setSensorAvailabilityHandler((sensorType, isAvailable) =>
      this.setSensorAvailability(sensorType, isAvailable)
    );
  }

  private setSensorAvailability(sensorType: SensorType, isAvailable: boolean) {
    this.availability.set(sensorType, isAvailable);
    this.availabilityListeners.forEach((listener) => listener());
  }

  isSensorAvailable(sensorType: SensorType): boolean {
    let isAvailable = this.availability.get(sensorType);
    if (isAvailable === undefined) {
      isAvailable = ReanimatedModule.isSensorAvailable(sensorType);
      this.availability.set(sensorType, isAvailable);
    }
    return isAvailable;
  }

  subscribeToSensorAvailability(listener: () => void): () => void {
    this.availabilityListeners.add(listener);
    return () => {
      this.availabilityListeners.delete(listener);
    };
  }

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
    if (sensor && (sensor.isRunning() || sensor.register(handler))) {
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
