import { isChromeDebugger, isJest, isWeb } from '../PlatformChecker';
import type {
  ShareableRef,
  ShareableSyncDataHolderRef,
  Value3D,
  ValueRotation,
} from '../commonTypes';
import { SensorType } from '../commonTypes';
import type { WebSensor } from './WebSensor';

export default class JSReanimated {
  native = false;
  nextSensorId = 0;
  sensors = new Map<number, WebSensor>();
  platform?: Platform = undefined;

  makeShareableClone<T>(): ShareableRef<T> {
    throw new Error(
      '[Reanimated] makeShareableClone should never be called in JSReanimated.'
    );
  }

  installCoreFunctions(
    _callGuard: <T extends Array<unknown>, U>(
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
  ): number {
    // noop
    return -1;
  }

  unregisterEventHandler(_: number): void {
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
    _iosReferenceFrame: number,
    eventHandler: ShareableRef<(data: Value3D | ValueRotation) => void>
  ): number {
    if (this.platform === undefined) {
      this.detectPlatform();
    }

    if (!(this.getSensorName(sensorType) in window)) {
      // https://w3c.github.io/sensors/#secure-context
      console.warn(
        '[Reanimated] Sensor is not available.' +
          (isWeb() && location.protocol !== 'https:'
            ? ' Make sure you use secure origin with `npx expo start --web --https`.'
            : '') +
          (this.platform === Platform.WEB_IOS
            ? ' For iOS web, you will also have to also grant permission in the browser: https://dev.to/li/how-to-requestpermission-for-devicemotion-and-deviceorientation-events-in-ios-13-46g2.'
            : '')
      );
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
        // TODO TYPESCRIPT on web ShareableRef is the value itself so we call it directly
        (eventHandler as any)({
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
        // TODO TYPESCRIPT on web ShareableRef is the value itself so we call it directly
        (eventHandler as any)({ x, y, z, interfaceOrientation: 0 });
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

  makeSynchronizedDataHolder<T>(
    _valueRef: ShareableRef<T>
  ): ShareableSyncDataHolderRef<T> {
    throw new Error(
      '[Reanimated] makeSynchronizedDataHolder is not available in JSReanimated.'
    );
  }

  getDataSynchronously<T>(_ref: ShareableSyncDataHolderRef<T>): T {
    throw new Error(
      '[Reanimated] getDataSynchronously is not available in JSReanimated.'
    );
  }

  getViewProp<T>(
    _viewTag: string,
    _propName: string,
    _callback?: (result: T) => void
  ): Promise<T> {
    throw new Error(
      '[Reanimated] getViewProp is not available in JSReanimated.'
    );
  }

  configureProps() {
    throw new Error(
      '[Reanimated] configureProps is not available in JSReanimated.'
    );
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
