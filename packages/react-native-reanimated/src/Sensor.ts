'use strict';
import type {
  SensorConfig,
  ShareableRef,
  SharedValue,
  Value3D,
  ValueRotation,
  WorkletFunction,
} from './commonTypes';
import { SensorType } from './commonTypes';
import { makeMutable } from './mutables';
import { ReanimatedModule } from './ReanimatedModule';

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

export default class Sensor {
  public listenersNumber = 0;
  private sensorId: number | null = null;
  private sensorType: SensorType;
  private data: SharedValue<Value3D | ValueRotation>;
  private config: SensorConfig;

  constructor(sensorType: SensorType, config: SensorConfig) {
    this.sensorType = sensorType;
    this.config = config;
    this.data = initSensorData(sensorType);
  }

  register(
    eventHandler: ShareableRef<(data: Value3D | ValueRotation) => void>
  ) {
    const config = this.config;
    const sensorType = this.sensorType;
    this.sensorId = ReanimatedModule.registerSensor(
      sensorType,
      config.interval === 'auto' ? -1 : config.interval,
      config.iosReferenceFrame,
      eventHandler as ShareableRef<WorkletFunction>
    );
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
