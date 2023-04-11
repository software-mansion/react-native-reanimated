import {
  SensorType,
  SensorConfig,
  SharedValue,
  Value3D,
  ValueRotation,
  ShareableRef,
} from './commonTypes';

export class NativeSensor<T> {
  private listenersNumber = 0;
  private sensorId = -1;
  private sensorType: SensorType;
  private InnerNativeModule: any;
  private data: SharedValue<Value3D | ValueRotation>;
  private config: SensorConfig;
  private eventHandler:
    | ShareableRef<T>
    | ((data: Value3D | ValueRotation) => void);

  constructor(
    sensorType: SensorType,
    InnerNativeModule: any,
    config: SensorConfig,
    initData: SharedValue<Value3D | ValueRotation>,
    eventHandler: ShareableRef<T> | ((data: Value3D | ValueRotation) => void)
  ) {
    this.sensorType = sensorType;
    this.InnerNativeModule = InnerNativeModule;
    this.config = config;
    this.data = initData;
    this.eventHandler = eventHandler;
  }

  initialize() {
    const config = this.config;
    const sensorType = this.sensorType;

    this.sensorId = this.InnerNativeModule.registerSensor(
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
    this.InnerNativeModule.unregisterSensor(this.sensorId);
    this.sensorId = -1;
  }

  addListener() {
    this.listenersNumber++;
  }

  removeListener() {
    this.listenersNumber--;
  }
}
