'use strict';
import type { SerializableRef, WorkletFunction } from 'react-native-worklets';

import type {
  SensorConfig,
  SensorValue,
  SensorValueMap,
  SharedValue,
} from './commonTypes';
import { HingeStatus, SensorType } from './commonTypes';
import { makeMutable } from './mutables';
import { ReanimatedModule } from './ReanimatedModule';

const createValue3D = () => ({ x: 0, y: 0, z: 0, interfaceOrientation: 0 });

const INITIAL_SENSOR_VALUES: {
  [K in SensorType]: () => SensorValueMap[K];
} = {
  [SensorType.ACCELEROMETER]: createValue3D,
  [SensorType.GYROSCOPE]: createValue3D,
  [SensorType.GRAVITY]: createValue3D,
  [SensorType.MAGNETIC_FIELD]: createValue3D,
  [SensorType.ROTATION]: () => ({
    qw: 0,
    qx: 0,
    qy: 0,
    qz: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    interfaceOrientation: 0,
  }),
  [SensorType.HINGE]: () => ({
    angle: 0,
    status: HingeStatus.UNKNOWN,
    interfaceOrientation: 0,
  }),
};

export default class Sensor<T extends SensorType = SensorType> {
  public listenersNumber = 0;
  private sensorId: number | null = null;
  private sensorType: SensorType;
  private data: SharedValue<SensorValueMap[T]>;
  private config: SensorConfig;

  constructor(sensorType: T, config: SensorConfig) {
    this.sensorType = sensorType;
    this.config = config;
    this.data = makeMutable(INITIAL_SENSOR_VALUES[sensorType]());
  }

  register(eventHandler: SerializableRef<(data: SensorValue) => void>) {
    const config = this.config;
    const sensorType = this.sensorType;
    this.sensorId = ReanimatedModule.registerSensor(
      sensorType,
      config.interval === 'auto' ? -1 : config.interval,
      config.iosReferenceFrame,
      eventHandler as SerializableRef<WorkletFunction>
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
