import NativeReanimatedModule from './NativeReanimated';
import {
  SensorType,
  SensorConfig,
  SharedValue,
  Value3D,
  ValueRotation,
  ShareableRef,
} from './commonTypes';

export default class Sensor<T> {
  private listenersNumber = 0;
  private sensorId = -1;
  private sensorType: SensorType;
  public data: SharedValue<Value3D | ValueRotation>;
  private config: SensorConfig;
  private eventHandler:
    | ShareableRef<T>
    | ((data: Value3D | ValueRotation) => void);

  constructor(
    sensorType: SensorType,
    config: SensorConfig,
    initData: SharedValue<Value3D | ValueRotation>,
    eventHandler: ShareableRef<T> | ((data: Value3D | ValueRotation) => void)
  ) {
    this.sensorType = sensorType;
    this.config = config;
    this.data = initData;
    this.eventHandler = eventHandler;
  }

  initialize() {
    const config = this.config;
    const sensorType = this.sensorType;
    this.sensorId = NativeReanimatedModule.registerSensor(
      sensorType,
      config.interval === 'auto' ? -1 : config.interval,
      config.iosReferenceFrame,
      this.eventHandler
    );
    return this.sensorId !== -1;
  }

  hasActiveListeners() {
    return this.listenersNumber !== 0;
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

  addListener() {
    this.listenersNumber++;
  }

  removeListener() {
    this.listenersNumber--;
  }
}
