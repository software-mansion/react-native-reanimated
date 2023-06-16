import { NativeReanimated } from '../NativeReanimated/NativeReanimated';
import { isChromeDebugger, isJest, isWeb } from '../PlatformChecker';
import {
  SensorType,
  ShareableRef,
  Value3D,
  ValueRotation,
} from '../commonTypes';
import { WebSensor } from './WebSensor';

export default class JSReanimated extends NativeReanimated {
  nextSensorId = 0;
  sensors = new Map<number, WebSensor>();
  platform?: Platform = undefined;

  constructor() {
    super(false);
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
    if (isWeb()) {
      console.warn(
        '[Reanimated] Layout Animations are not supported on web yet.'
      );
    } else if (isChromeDebugger()) {
      console.warn(
        '[Reanimated] Layout Animations are no-ops when using Chrome Debugger.'
      );
    } else if (isJest()) {
      console.warn(
        '[Reanimated] Layout Animations are no-ops when using Jest.'
      );
    } else {
      console.warn(
        '[Reanimated] Layout Animations are not supported on this configuration.'
      );
    }
  }

  configureLayoutAnimation() {
    // no-op
  }

  registerSensor(
    sensorType: SensorType,
    interval: number,
    iosReferenceFrame: number,
    eventHandler: (data: Value3D | ValueRotation) => void
  ): number {
    if (!(this.getSensorName(sensorType) in window)) {
      return -1;
    }

    if (this.platform === undefined) {
      this.detectPlatform();
    }

    const sensor: WebSensor = this.initializeSensor(sensorType, interval);
    let callback;
    if (sensorType === SensorType.ROTATION) {
      callback = () => {
        let [qw, qx, qy, qz] = sensor.quaternion;

        // Android sensors have a different coordinate system than iOS
        if (this.platform === Platform.WEB_ANDROID) {
          [qy, qz] = [qz, -qy];
        }

        // reference: https://stackoverflow.com/questions/5782658/extracting-yaw-from-a-quaternion
        const yaw = Math.atan2(
          2.0 * (qy * qz + qw * qx),
          qw * qw - qx * qx - qy * qy + qz * qz
        );
        const pitch = Math.sin(-2.0 * (qx * qz - qw * qy));
        const roll = Math.atan2(
          2.0 * (qx * qy + qw * qz),
          qw * qw + qx * qx - qy * qy - qz * qz
        );
        eventHandler({
          qw,
          qx,
          qy,
          qz,
          yaw,
          pitch,
          roll,
          interfaceOrientation: 0,
        });
      };
    } else {
      callback = () => {
        let { x, y, z } = sensor;
        [x, y, z] =
          this.platform === Platform.WEB_ANDROID ? [-x, -y, -z] : [x, y, z];
        eventHandler({ x, y, z, interfaceOrientation: 0 });
      };
    }
    sensor.addEventListener('reading', callback);
    sensor.start();

    this.sensors.set(this.nextSensorId, sensor);
    return this.nextSensorId++;
  }

  unregisterSensor(id: number): void {
    const sensor: WebSensor | undefined = this.sensors.get(id);
    if (sensor !== undefined) {
      sensor.stop();
      this.sensors.delete(id);
    }
  }

  subscribeForKeyboardEvents(_: ShareableRef<number>): number {
    if (isWeb()) {
      console.warn(
        '[Reanimated] useAnimatedKeyboard is not available on web yet.'
      );
    } else if (isChromeDebugger()) {
      console.warn(
        '[Reanimated] useAnimatedKeyboard is not available when using Chrome Debugger.'
      );
    } else if (isJest()) {
      console.warn(
        '[Reanimated] useAnimatedKeyboard is not available when using Jest.'
      );
    } else {
      console.warn(
        '[Reanimated] useAnimatedKeyboard is not available on this configuration.'
      );
    }
    return -1;
  }

  unsubscribeFromKeyboardEvents(_: number): void {
    // noop
  }

  initializeSensor(sensorType: SensorType, interval: number): WebSensor {
    const config =
      interval <= 0
        ? { referenceFrame: 'device' }
        : { frequency: 1000 / interval };
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
        return 'GravitySensor';
      case SensorType.GYROSCOPE:
        return 'Gyroscope';
      case SensorType.MAGNETIC_FIELD:
        return 'Magnetometer';
      case SensorType.ROTATION:
        return 'AbsoluteOrientationSensor';
    }
  }

  detectPlatform() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (userAgent === undefined) {
      this.platform = Platform.UNKNOWN;
    } else if (/iPad|iPhone|iPod/.test(userAgent)) {
      this.platform = Platform.WEB_IOS;
    } else if (/android/i.test(userAgent)) {
      this.platform = Platform.WEB_ANDROID;
    } else {
      this.platform = Platform.WEB;
    }
  }
}

enum Platform {
  WEB_IOS = 'web iOS',
  WEB_ANDROID = 'web Android',
  WEB = 'web',
  UNKNOWN = 'unknown',
}

declare global {
  interface Navigator {
    userAgent?: string;
    vendor?: string;
  }
}
