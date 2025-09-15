'use strict';

import { SensorType } from './commonTypes';
import { makeMutable } from './mutables';
import { ReanimatedModule } from './ReanimatedModule';
function initSensorData(sensorType) {
  if (sensorType === SensorType.ROTATION) {
    return makeMutable({
      qw: 0,
      qx: 0,
      qy: 0,
      qz: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
      interfaceOrientation: 0
    });
  } else {
    return makeMutable({
      x: 0,
      y: 0,
      z: 0,
      interfaceOrientation: 0
    });
  }
}
export default class Sensor {
  listenersNumber = 0;
  sensorId = null;
  constructor(sensorType, config) {
    this.sensorType = sensorType;
    this.config = config;
    this.data = initSensorData(sensorType);
  }
  register(eventHandler) {
    const config = this.config;
    const sensorType = this.sensorType;
    this.sensorId = ReanimatedModule.registerSensor(sensorType, config.interval === 'auto' ? -1 : config.interval, config.iosReferenceFrame, eventHandler);
    return this.sensorId !== -1;
  }
  isRunning() {
    return this.sensorId !== -1 && this.sensorId !== null;
  }
  isAvailable() {
    return this.sensorId !== -1;
  }
  getSharedValue() {
    return this.data;
  }
  unregister() {
    if (this.sensorId !== null && this.sensorId !== -1) {
      ReanimatedModule.unregisterSensor(this.sensorId);
    }
    this.sensorId = null;
  }
}
//# sourceMappingURL=Sensor.js.map