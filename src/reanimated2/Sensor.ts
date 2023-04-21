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
  private sensorId = -1;
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
    // prevent another sensor registration at the same time
    this.sensorId = -2;
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
    return this.sensorId !== -1;
  }

  getSharedValue() {
    return this.data;
  }

  unregister() {
    NativeReanimatedModule.unregisterSensor(this.sensorId);
    this.sensorId = -1;
  }
}
