'use strict';
import type { WorkletFunction } from 'react-native-worklets';
import { createSerializable } from 'react-native-worklets';

import type { SharedValue, ValueHinge } from './commonTypes';
import { HingeStatus } from './commonTypes';
import { makeMutable } from './mutables';
import { ReanimatedModule } from './ReanimatedModule';

// The same number as in the native sensor type enums.
const HINGE_SENSOR_TYPE = 6;
const AUTO_INTERVAL = -1;
const NO_REFERENCE_FRAME = 0;

export class HingeSensor {
  private readonly data: SharedValue<ValueHinge> = makeMutable<ValueHinge>({
    angle: 0,
    status: HingeStatus.UNKNOWN,
  });

  private sensorId: number | null = null;
  private listenersNumber = 0;
  private availability: boolean;
  private availabilityListeners: Set<() => void> = new Set();

  constructor() {
    ReanimatedModule.setSensorAvailabilityHandler((sensorType, isAvailable) => {
      if (sensorType === HINGE_SENSOR_TYPE) {
        this.availability = isAvailable;
        this.availabilityListeners.forEach((listener) => listener());
      }
    });
    this.availability = ReanimatedModule.isSensorAvailable(HINGE_SENSOR_TYPE);
  }

  getSharedValue() {
    return this.data;
  }

  // `useSyncExternalStore` needs stable functions, thus these two are properties.
  isAvailable = () => this.availability;

  subscribeToAvailability = (listener: () => void) => {
    this.availabilityListeners.add(listener);
    return () => {
      this.availabilityListeners.delete(listener);
    };
  };

  register() {
    this.listenersNumber++;
    if (this.sensorId !== null) {
      return;
    }
    const data = this.data;
    const sensorId = ReanimatedModule.registerSensor(
      HINGE_SENSOR_TYPE,
      AUTO_INTERVAL,
      NO_REFERENCE_FRAME,
      createSerializable(((value: ValueHinge) => {
        'worklet';
        data.value = value;
      }) as WorkletFunction)
    );
    if (sensorId !== -1) {
      this.sensorId = sensorId;
    }
  }

  unregister() {
    this.listenersNumber--;
    if (this.listenersNumber === 0 && this.sensorId !== null) {
      ReanimatedModule.unregisterSensor(this.sensorId);
      this.sensorId = null;
    }
  }
}
