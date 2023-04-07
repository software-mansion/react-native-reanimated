import {
  SensorType,
  SensorConfig,
  SharedValue,
  Value3D,
  ValueRotation,
} from './commonTypes';
import {
  adjustRotationToInterfaceOrientation,
  adjustVectorToInterfaceOrientation,
  initSensorData,
} from './sensorUtils';
import { makeShareableCloneRecursive } from './shareables';
import { callMicrotasks } from './threads';

export class NativeSensor {
  private listenersNumber = 0;
  private sensorId = -1;
  private sensorType: SensorType;
  private InnerNativeModule: any;
  private data: SharedValue<Value3D | ValueRotation>;
  private config: SensorConfig;

  constructor(
    sensorType: SensorType,
    InnerNativeModule: any,
    config: SensorConfig
  ) {
    this.sensorType = sensorType;
    this.InnerNativeModule = InnerNativeModule;
    this.config = config;
    this.data = initSensorData(sensorType);
  }

  initialize() {
    const sensorData = this.data;
    const config = this.config;
    const sensorType = this.sensorType;

    this.sensorId = this.InnerNativeModule.registerSensor(
      sensorType,
      config.interval === 'auto' ? -1 : config.interval,
      config.iosReferenceFrame,
      makeShareableCloneRecursive((data: Value3D | ValueRotation) => {
        'worklet';
        if (config.adjustToInterfaceOrientation) {
          if (sensorType === SensorType.ROTATION) {
            data = adjustRotationToInterfaceOrientation(data as ValueRotation);
          } else {
            data = adjustVectorToInterfaceOrientation(data as Value3D);
          }
        }
        sensorData.value = data;
        callMicrotasks();
      })
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
