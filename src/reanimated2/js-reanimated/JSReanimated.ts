import { NativeReanimated } from '../NativeReanimated/NativeReanimated';
import { ShareableRef, Value3D, ValueRotation } from '../commonTypes';
import { isJest } from '../PlatformChecker';

declare global {
  interface Window {
    Accelerometer: any;
    GravitySensor: any;
    Gyroscope: any;
    Magnetometer: any;
    AbsoluteOrientationSensor: any;
    Sensor: any;
  }
}

export enum SensorType {
  ACCELEROMETER = 1,
  GYROSCOPE = 2,
  GRAVITY = 3,
  MAGNETIC_FIELD = 4,
  ROTATION = 5,
}

export default class JSReanimated extends NativeReanimated {
  nextSensorId = 0;
  sensors = new Map<number, any>();

  constructor() {
    super(false);
    if (isJest()) {
      // on node < 16 jest have problems mocking performance.now method which
      // results in the tests failing, since date precision isn't that important
      // for tests, we use Date.now instead
      this.getTimestamp = () => Date.now();
    } else {
      this.getTimestamp = () => window.performance.now();
    }
  }

  makeShareableClone<T>(value: T): ShareableRef<T> {
    return { __hostObjectShareableJSRef: value };
  }

  installCoreFunctions(
    _callGuard: <T extends Array<any>, U>(
      fn: (...args: T) => U,
      ...args: T
    ) => void,
    _valueUnpacker: <T>(value: T) => T
  ): void {
    // noop
  }

  scheduleOnUI<T>(worklet: ShareableRef<T>) {
    // @ts-ignore web implementation has still not been updated after the rewrite, this will be addressed once the web implementation updates are ready
    requestAnimationFrame(worklet);
  }

  registerEventHandler<T>(
    _eventHash: string,
    _eventHandler: ShareableRef<T>
  ): string {
    // noop
    return '';
  }

  unregisterEventHandler(_: string): void {
    // noop
  }

  enableLayoutAnimations() {
    console.warn(
      '[Reanimated] enableLayoutAnimations is not available for WEB yet'
    );
  }

  registerSensor(
    sensorType: SensorType,
    interval: number,
    eventHandler: (data: Value3D | ValueRotation) => void
  ): number {
    if (!(this.getSensorName(sensorType) in window)) {
      return -1;
    }

    const sensor = this.initializeSensor(sensorType, interval);
    sensor.addEventListener('reading', () => {
      if (sensorType === SensorType.ROTATION) {
        const qw = sensor.quaternion[0];
        const qx = sensor.quaternion[1];
        const qy = sensor.quaternion[2];
        const qz = sensor.quaternion[3];

        eventHandler({
          qw: qw,
          qx: qx,
          qy: qy,
          qz: qz,
          yaw: Math.atan2(
            2.0 * (qy * qz + qw * qx),
            qw * qw - qx * qx - qy * qy + qz * qz
          ),
          pitch: Math.sin(-2.0 * (qx * qz - qw * qy)),
          roll: Math.atan2(
            2.0 * (qx * qy + qw * qz),
            qw * qw + qx * qx - qy * qy - qz * qz
          ),
        });
      } else {
        eventHandler({
          x: sensor.x,
          y: sensor.y,
          z: sensor.z,
        });
      }
    });
    sensor.start();

    this.sensors.set(this.nextSensorId, sensor);
    return this.nextSensorId++;
  }

  unregisterSensor(id: number): void {
    const sensor: Window['Sensor'] = this.sensors.get(id);
    sensor.stop();
    this.sensors.delete(id);
  }

  subscribeForKeyboardEvents(_: ShareableRef<number>): number {
    console.warn(
      '[Reanimated] useAnimatedKeyboard is not available on web yet.'
    );
    return -1;
  }

  unsubscribeFromKeyboardEvents(_: number): void {
    // noop
  }

  initializeSensor(sensorType: SensorType, interval: number): Window['Sensor'] {
    const config =
      interval === -1
        ? { referenceFrame: 'device' }
        : { frequency: 1 / interval };
    switch (sensorType) {
      case SensorType.ACCELEROMETER:
        return new window.Accelerometer(config);
      case SensorType.GYROSCOPE:
        return new window.Gyroscope(config);
      case SensorType.GRAVITY:
        return new window.GravitySensor(config);
      case SensorType.MAGNETIC_FIELD:
        return new window.Magnetometer(config);
      case SensorType.ROTATION:
        return new window.AbsoluteOrientationSensor(config);
    }
  }

  getSensorName(sensorType: SensorType): string {
    switch (sensorType) {
      case SensorType.ACCELEROMETER:
        return 'Accelerometer';
      case SensorType.GRAVITY:
        return 'Gravity';
      case SensorType.GYROSCOPE:
        return 'Gyroscope';
      case SensorType.MAGNETIC_FIELD:
        return 'Magnetometer';
      case SensorType.ROTATION:
        return 'AbsoluteOrientationSensor';
    }
  }
}
