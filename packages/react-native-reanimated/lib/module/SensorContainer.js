'use strict';

import Sensor from './Sensor';
export class SensorContainer {
  nativeSensors = new Map();
  getSensorId(sensorType, config) {
    return sensorType * 100 + config.iosReferenceFrame * 10 + Number(config.adjustToInterfaceOrientation);
  }
  initializeSensor(sensorType, config) {
    const sensorId = this.getSensorId(sensorType, config);
    if (!this.nativeSensors.has(sensorId)) {
      const newSensor = new Sensor(sensorType, config);
      this.nativeSensors.set(sensorId, newSensor);
    }
    const sensor = this.nativeSensors.get(sensorId);
    return sensor.getSharedValue();
  }
  registerSensor(sensorType, config, handler) {
    const sensorId = this.getSensorId(sensorType, config);
    if (!this.nativeSensors.has(sensorId)) {
      return -1;
    }
    const sensor = this.nativeSensors.get(sensorId);
    if (sensor && sensor.isAvailable() && (sensor.isRunning() || sensor.register(handler))) {
      sensor.listenersNumber++;
      return sensorId;
    }
    return -1;
  }
  unregisterSensor(sensorId) {
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
//# sourceMappingURL=SensorContainer.js.map