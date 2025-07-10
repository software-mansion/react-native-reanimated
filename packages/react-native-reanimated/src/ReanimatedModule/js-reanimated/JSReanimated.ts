'use strict';
import type {
  IWorkletsModule,
  ShareableRef,
  WorkletFunction,
} from 'react-native-worklets';
import { WorkletsModule } from 'react-native-worklets';

import {
  IS_JEST,
  IS_WEB,
  IS_WINDOW_AVAILABLE,
  logger,
  ReanimatedError,
} from '../../common';
import type {
  ShadowNodeWrapper,
  StyleProps,
  Value3D,
  ValueRotation,
} from '../../commonTypes';
import { SensorType } from '../../commonTypes';
import type {
  CSSAnimationUpdates,
  NormalizedCSSAnimationKeyframesConfig,
  NormalizedCSSTransitionConfig,
} from '../../css/platform/native';
import { assertWorkletsVersion } from '../../platform-specific/workletsVersion';
import type { IReanimatedModule } from '../reanimatedModuleProxy';
import type { WebSensor } from './WebSensor';

export function createJSReanimatedModule(): IReanimatedModule {
  return new JSReanimated();
}

class JSReanimated implements IReanimatedModule {
  /**
   * We keep the instance of `WorkletsModule` here to keep correct coupling of
   * the modules and initialization order.
   */
  // eslint-disable-next-line no-unused-private-class-members
  #workletsModule: IWorkletsModule = WorkletsModule;
  nextSensorId = 0;
  sensors = new Map<number, WebSensor>();
  platform?: Platform = undefined;

  constructor() {
    if (__DEV__) {
      assertWorkletsVersion();
    }
  }

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
    if (!IS_WINDOW_AVAILABLE) {
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
          (IS_WEB && location.protocol !== 'https:'
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
          const [qw, qx] = sensor.quaternion;
          let [, , qy, qz] = sensor.quaternion;

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
    if (IS_WEB) {
      logger.warn('useAnimatedKeyboard is not available on web yet.');
    } else if (IS_JEST) {
      logger.warn('useAnimatedKeyboard is not available when using Jest.');
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

  setDynamicFeatureFlag(_name: string, _value: boolean): void {
    // noop
  }

  setViewStyle(_viewTag: number, _style: StyleProps): void {
    throw new ReanimatedError('setViewStyle is not available in JSReanimated.');
  }

  markNodeAsRemovable(_shadowNodeWrapper: ShadowNodeWrapper): void {
    throw new ReanimatedError(
      'markNodeAsRemovable is not available in JSReanimated.'
    );
  }

  unmarkNodeAsRemovable(_viewTag: number): void {
    throw new ReanimatedError(
      'unmarkNodeAsRemovable is not available in JSReanimated.'
    );
  }

  registerCSSKeyframes(
    _animationName: string,
    _keyframesConfig: NormalizedCSSAnimationKeyframesConfig
  ): void {
    throw new ReanimatedError(
      '`registerCSSKeyframes` is not available in JSReanimated.'
    );
  }

  unregisterCSSKeyframes(_animationName: string): void {
    throw new ReanimatedError(
      '`unregisterCSSKeyframes` is not available in JSReanimated.'
    );
  }

  applyCSSAnimations(
    _shadowNodeWrapper: ShadowNodeWrapper,
    _animationUpdates: CSSAnimationUpdates
  ) {
    throw new ReanimatedError(
      '`applyCSSAnimations` is not available in JSReanimated.'
    );
  }

  unregisterCSSAnimations(_viewTag: number): void {
    throw new ReanimatedError(
      '`unregisterCSSAnimations` is not available in JSReanimated.'
    );
  }

  registerCSSTransition(
    _shadowNodeWrapper: ShadowNodeWrapper,
    _transitionConfig: NormalizedCSSTransitionConfig
  ): void {
    throw new ReanimatedError(
      '`registerCSSTransition` is not available in JSReanimated.'
    );
  }

  updateCSSTransition(
    _viewTag: number,
    _settingsUpdates: Partial<NormalizedCSSTransitionConfig>
  ): void {
    throw new ReanimatedError(
      '`updateCSSTransition` is not available in JSReanimated.'
    );
  }

  unregisterCSSTransition(_viewTag: number): void {
    throw new ReanimatedError(
      '`unregisterCSSTransition` is not available in JSReanimated.'
    );
  }
}

// Lack of this export breaks TypeScript generation since
// an enum transpiles into JavaScript code.
/** @knipIgnore */
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
