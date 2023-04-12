import {
  SensorType,
  SensorConfig,
  Value3D,
  ValueRotation,
  ShareableRef,
  AnimatedSensor,
} from './commonTypes';
import Sensor from './Sensor';

export class SensorContainer {
  private nativeSensors: Map<number, Sensor<any>> = new Map();

  getSensorId(sensorType: SensorType, config: SensorConfig) {
    return (
      sensorType * 100 +
      config.iosReferenceFrame * 10 +
      Number(config.adjustToInterfaceOrientation)
    );
  }

  registerSensor<T>(
    sensorType: SensorType,
    sensorRef: React.MutableRefObject<AnimatedSensor>,
    handler: ShareableRef<T> | ((data: Value3D | ValueRotation) => void)
  ): number {
    const config = sensorRef.current.config;
    const sensorId = this.getSensorId(sensorType, config);
    console.log(this.nativeSensors.size);

    if (!this.nativeSensors.has(sensorId)) {
      const newSensor = new Sensor(
        sensorType,
        config,
        sensorRef.current.sensor,
        handler
      );
      this.nativeSensors.set(sensorId, newSensor);
    }

    const sensor = this.nativeSensors?.get(sensorId);

    if (!sensor?.isRunning()) {
      if (!sensor?.initialize()) {
        return -1;
      }
    }
    sensorRef.current.sensor = sensor?.getSharedValue();
    sensor?.addListener();
    return sensorId;
  }

  unregisterSensor(sensorId: number) {
    if (this.nativeSensors.has(sensorId)) {
      const sensor = this.nativeSensors.get(sensorId);
      sensor?.removeListener();

      if (!sensor?.hasActiveListeners()) {
        sensor?.unregister();
        this.nativeSensors.delete(sensorId);
      }
    }
  }
}
