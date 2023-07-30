import type {
  SensorType,
  SensorConfig,
  Value3D,
  ValueRotation,
  ShareableRef,
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

  initializeSensor(
    sensorType: SensorType,
    config: SensorConfig
  ): SharedValue<Value3D | ValueRotation> {
    const sensorId = this.getSensorId(sensorType, config);

    if (!this.nativeSensors.has(sensorId)) {
      const newSensor = new Sensor(sensorType, config);
      this.nativeSensors.set(sensorId, newSensor);
    }

    const sensor = this.nativeSensors.get(sensorId);
    return sensor!.getSharedValue();
  }

  registerSensor(
    sensorType: SensorType,
    config: SensorConfig,
    handler: ShareableRef<(data: Value3D | ValueRotation) => void>
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
