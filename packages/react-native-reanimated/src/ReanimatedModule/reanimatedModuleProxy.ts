'use strict';

import type {
  ShareableRef,
  ShadowNodeWrapper,
  Value3D,
  ValueRotation,
  LayoutAnimationBatchItem,
} from '../commonTypes';
import type { WorkletRuntime } from '../runtimes';

/** Type of `__reanimatedModuleProxy` injected with JSI. */
export interface ReanimatedModuleProxy {
  makeShareableClone<T>(
    value: T,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ): ShareableRef<T>;

  scheduleOnUI<T>(shareable: ShareableRef<T>): void;

  executeOnUIRuntimeSync<T, R>(shareable: ShareableRef<T>): R;

  createWorkletRuntime(
    name: string,
    initializer: ShareableRef<() => void>
  ): WorkletRuntime;

  scheduleOnRuntime<T>(
    workletRuntime: WorkletRuntime,
    worklet: ShareableRef<T>
  ): void;

  registerEventHandler<T>(
    eventHandler: ShareableRef<T>,
    eventName: string,
    emitterReactTag: number
  ): number;

  unregisterEventHandler(id: number): void;

  getViewProp<T>(
    viewTagOrShadowNodeWrapper: number | ShadowNodeWrapper,
    propName: string,
    callback?: (result: T) => void
  ): Promise<T>;

  enableLayoutAnimations(flag: boolean): void;

  registerSensor(
    sensorType: number,
    interval: number,
    iosReferenceFrame: number,
    handler: ShareableRef<(data: Value3D | ValueRotation) => void>
  ): number;

  unregisterSensor(sensorId: number): void;

  configureProps(uiProps: string[], nativeProps: string[]): void;

  subscribeForKeyboardEvents(
    handler: ShareableRef<number>,
    isStatusBarTranslucent: boolean,
    isNavigationBarTranslucent: boolean
  ): number;

  unsubscribeFromKeyboardEvents(listenerId: number): void;

  configureLayoutAnimationBatch(
    layoutAnimationsBatch: LayoutAnimationBatchItem[]
  ): void;

  setShouldAnimateExitingForTag(viewTag: number, shouldAnimate: boolean): void;
}
