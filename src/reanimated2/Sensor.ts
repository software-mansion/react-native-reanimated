import NativeReanimatedModule from './NativeReanimated';
import {
  SensorType,
  SensorConfig,
  SharedValue,
  Value3D,
  ValueRotation,
  ShareableRef,
} from './commonTypes';
import { makeMutable } from './mutables';

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

export default class Sensor<T> {
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
    eventHandler: ShareableRef<T> | ((data: Value3D | ValueRotation) => void)
  ) {
    const config = this.config;
    const sensorType = this.sensorType;
    this.sensorId = NativeReanimatedModule.registerSensor(
      sensorType,
      config.interval === 'auto' ? -1 : config.interval,
      config.iosReferenceFrame,
      eventHandler
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
      NativeReanimatedModule.unregisterSensor(this.sensorId);
    }
    this.sensorId = null;
  }
}
