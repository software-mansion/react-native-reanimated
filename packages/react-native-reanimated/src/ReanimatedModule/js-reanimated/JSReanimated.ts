'use strict';
import {
  isChromeDebugger,
  isJest,
  isWeb,
  isWindowAvailable,
} from '../../PlatformChecker';
import { SensorType } from '../../commonTypes';
import type {
  IReanimatedModule,
  IWorkletsModule,
  ShadowNodeWrapper,
  ShareableRef,
  StyleProps,
  Value3D,
  ValueRotation,
  WorkletFunction,
} from '../../commonTypes';
import type { WebSensor } from './WebSensor';
import { logger } from '../../logger';
import { ReanimatedError } from '../../errors';
import { WorkletsModule } from '../../worklets';
import type {
  NormalizedCSSAnimationConfig,
  NormalizedCSSAnimationSettings,
} from '../../css';
import type { NormalizedCSSTransitionConfig } from '../../css/types';

export function createJSReanimatedModule(): IReanimatedModule {
  return new JSReanimated();
}

class JSReanimated implements IReanimatedModule {
  /**
   * We keep the instance of `WorkletsModule` here to keep correct coupling of
   * the modules and initialization order.
   */
  #workletsModule: IWorkletsModule = WorkletsModule;
  nextSensorId = 0;
  sensors = new Map<number, WebSensor>();
  platform?: Platform = undefined;

  registerEventHandler<T>(
    _eventHandler: ShareableRef<T>,
    _eventName: string,
    _emitterReactTag: number
  ): number {
    throw new ReanimatedError(
      'registerEventHandler is not available in JSReanimated.'
    );
  }

  unregisterEventHandler(_: number): void {
    throw new ReanimatedError(
      'unregisterEventHandler is not available in JSReanimated.'
    );
  }

  enableLayoutAnimations() {
    if (isWeb()) {
      logger.warn('Layout Animations are not supported on web yet.');
    } else if (isJest()) {
      logger.warn('Layout Animations are no-ops when using Jest.');
    } else if (isChromeDebugger()) {
      logger.warn('Layout Animations are no-ops when using Chrome Debugger.');
    } else {
      logger.warn('Layout Animations are not supported on this configuration.');
    }
  }

  configureLayoutAnimationBatch() {
    // no-op
  }

  setShouldAnimateExitingForTag() {
    // no-op
  }

  registerSensor(
    sensorType: SensorType,
    interval: number,
    _iosReferenceFrame: number,
    eventHandler: ShareableRef<(data: Value3D | ValueRotation) => void>
  ): number {
    if (!isWindowAvailable()) {
      // the window object is unavailable when building the server portion of a site that uses SSG
      // this check is here to ensure that the server build won't fail
      return -1;
    }

    if (this.platform === undefined) {
      this.detectPlatform();
    }

    if (!(this.getSensorName(sensorType) in window)) {
      // https://w3c.github.io/sensors/#secure-context
      logger.warn(
        'Sensor is not available.' +
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
    sensor.addEventListener(
      'reading',
      this.getSensorCallback(sensor, sensorType, eventHandler)
    );
    sensor.start();

    this.sensors.set(this.nextSensorId, sensor);
    return this.nextSensorId++;
  }

  getSensorCallback = (
    sensor: WebSensor,
    sensorType: SensorType,
    eventHandler: ShareableRef<(data: Value3D | ValueRotation) => void>
  ) => {
    switch (sensorType) {
      case SensorType.ACCELEROMETER:
      case SensorType.GRAVITY:
        return () => {
          let { x, y, z } = sensor;

          // Web Android sensors have a different coordinate system than iOS
          if (this.platform === Platform.WEB_ANDROID) {
            [x, y, z] = [-x, -y, -z];
          }
          // TODO TYPESCRIPT on web ShareableRef is the value itself so we call it directly
          (eventHandler as any)({ x, y, z, interfaceOrientation: 0 });
        };
      case SensorType.GYROSCOPE:
      case SensorType.MAGNETIC_FIELD:
        return () => {
          const { x, y, z } = sensor;
          // TODO TYPESCRIPT on web ShareableRef is the value itself so we call it directly
          (eventHandler as any)({ x, y, z, interfaceOrientation: 0 });
        };
      case SensorType.ROTATION:
        return () => {
          let [qw, qx, qy, qz] = sensor.quaternion;

          // Android sensors have a different coordinate system than iOS
          if (this.platform === Platform.WEB_ANDROID) {
            [qy, qz] = [qz, -qy];
          }

          // reference: https://stackoverflow.com/questions/5782658/extracting-yaw-from-a-quaternion
          const yaw = -Math.atan2(
            2.0 * (qy * qz + qw * qx),
            qw * qw - qx * qx - qy * qy + qz * qz
          );
          const pitch = Math.sin(-2.0 * (qx * qz - qw * qy));
          const roll = -Math.atan2(
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
    }
  };

  unregisterSensor(id: number): void {
    const sensor: WebSensor | undefined = this.sensors.get(id);
    if (sensor !== undefined) {
      sensor.stop();
      this.sensors.delete(id);
    }
  }

  subscribeForKeyboardEvents(_: ShareableRef<WorkletFunction>): number {
    if (isWeb()) {
      logger.warn('useAnimatedKeyboard is not available on web yet.');
    } else if (isJest()) {
      logger.warn('useAnimatedKeyboard is not available when using Jest.');
    } else if (isChromeDebugger()) {
      logger.warn(
        'useAnimatedKeyboard is not available when using Chrome Debugger.'
      );
    } else {
      logger.warn(
        'useAnimatedKeyboard is not available on this configuration.'
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

  getViewProp<T>(
    _viewTag: number,
    _propName: string,
    _component?: React.Component,
    _callback?: (result: T) => void
  ): Promise<T> {
    throw new ReanimatedError('getViewProp is not available in JSReanimated.');
  }

  configureProps() {
    throw new ReanimatedError(
      'configureProps is not available in JSReanimated.'
    );
  }

  setViewStyle(_viewTag: number, _style: StyleProps): void {
    throw new ReanimatedError('setViewStyle is not available in JSReanimated.');
  }

  removeViewStyle(_viewTag: number): void {
    throw new ReanimatedError(
      'removeViewStyle is not available in JSReanimated.'
    );
  }

  registerCSSAnimation(
    _shadowNodeWrapper: ShadowNodeWrapper,
    _animationId: number,
    _animationConfig: NormalizedCSSAnimationConfig
  ): void {
    throw new ReanimatedError(
      '`registerCSSAnimation` is not available in JSReanimated.'
    );
  }

  updateCSSAnimation(
    _animationId: number,
    _updatedSettings: Partial<NormalizedCSSAnimationSettings>
  ): void {
    throw new ReanimatedError(
      '`updateCSSAnimation` is not available in JSReanimated.'
    );
  }

  unregisterCSSAnimation(_animationId: number): void {
    throw new ReanimatedError(
      '`unregisterCSSAnimation` is not available in JSReanimated.'
    );
  }

  registerCSSTransition(
    _shadowNodeWrapper: ShadowNodeWrapper,
    _transitionId: number,
    _transitionConfig: NormalizedCSSTransitionConfig
  ): void {
    throw new ReanimatedError(
      '`registerCSSTransition` is not available in JSReanimated.'
    );
  }

  updateCSSTransition(
    _transitionId: number,
    _transitionConfig: NormalizedCSSTransitionConfig
  ): void {
    throw new ReanimatedError(
      '`updateCSSTransition` is not available in JSReanimated.'
    );
  }

  unregisterCSSTransition(_transitionId: number): void {
    throw new ReanimatedError(
      '`unregisterCSSTransition` is not available in JSReanimated.'
    );
  }
}

// Lack of this export breaks TypeScript generation since
// an enum transpiles into JavaScript code.
// ts-prune-ignore-next
export enum Platform {
  WEB_IOS = 'web iOS',
  WEB_ANDROID = 'web Android',
  WEB = 'web',
  UNKNOWN = 'unknown',
}

declare global {
  interface Navigator {
    userAgent: string;
    vendor: string;
  }
}
