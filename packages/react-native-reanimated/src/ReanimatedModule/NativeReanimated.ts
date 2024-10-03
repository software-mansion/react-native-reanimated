'use strict';
import type {
  ShadowNodeWrapper,
  Value3D,
  ValueRotation,
  ShareableRef,
  LayoutAnimationBatchItem,
  IReanimatedModule,
} from '../commonTypes';
import { checkCppVersion } from '../platform-specific/checkCppVersion';
import { jsVersion } from '../platform-specific/jsVersion';
import type { WorkletRuntime } from '../runtimes';
import { getValueUnpackerCode } from '../valueUnpacker';
import { isFabric } from '../PlatformChecker';
import type React from 'react';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { ReanimatedTurboModule } from '../specs';
import { ReanimatedError } from '../errors';

export function createNativeReanimatedModule() {
  return new NativeReanimatedModule();
}

// this is the type of `__reanimatedModuleProxy` which is injected using JSI
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

function assertSingleReanimatedInstance() {
  if (
    global._REANIMATED_VERSION_JS !== undefined &&
    global._REANIMATED_VERSION_JS !== jsVersion
  ) {
    throw new ReanimatedError(
      `Another instance of Reanimated was detected.
See \`https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#another-instance-of-reanimated-was-detected\` for more details. Previous: ${global._REANIMATED_VERSION_JS}, current: ${jsVersion}.`
    );
  }
}

class NativeReanimatedModule implements IReanimatedModule {
  #reanimatedModuleProxy: ReanimatedModuleProxy;

  constructor() {
    // These checks have to split since version checking depend on the execution order
    if (__DEV__) {
      assertSingleReanimatedInstance();
    }
    global._REANIMATED_VERSION_JS = jsVersion;
    if (global.__reanimatedModuleProxy === undefined) {
      ReanimatedTurboModule?.installTurboModule(getValueUnpackerCode());
    }
    if (global.__reanimatedModuleProxy === undefined) {
      throw new ReanimatedError(
        `Native part of Reanimated doesn't seem to be initialized.
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#native-part-of-reanimated-doesnt-seem-to-be-initialized for more details.`
      );
    }
    if (__DEV__) {
      checkCppVersion();
    }
    this.#reanimatedModuleProxy = global.__reanimatedModuleProxy;
  }

  makeShareableClone<T>(
    value: T,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ) {
    return this.#reanimatedModuleProxy.makeShareableClone(
      value,
      shouldPersistRemote,
      nativeStateSource
    );
  }

  scheduleOnUI<T>(shareable: ShareableRef<T>) {
    return this.#reanimatedModuleProxy.scheduleOnUI(shareable);
  }

  executeOnUIRuntimeSync<T, R>(shareable: ShareableRef<T>): R {
    return this.#reanimatedModuleProxy.executeOnUIRuntimeSync(shareable);
  }

  createWorkletRuntime(name: string, initializer: ShareableRef<() => void>) {
    return this.#reanimatedModuleProxy.createWorkletRuntime(name, initializer);
  }

  scheduleOnRuntime<T>(
    workletRuntime: WorkletRuntime,
    shareableWorklet: ShareableRef<T>
  ) {
    return this.#reanimatedModuleProxy.scheduleOnRuntime(
      workletRuntime,
      shareableWorklet
    );
  }

  registerSensor(
    sensorType: number,
    interval: number,
    iosReferenceFrame: number,
    handler: ShareableRef<(data: Value3D | ValueRotation) => void>
  ) {
    return this.#reanimatedModuleProxy.registerSensor(
      sensorType,
      interval,
      iosReferenceFrame,
      handler
    );
  }

  unregisterSensor(sensorId: number) {
    return this.#reanimatedModuleProxy.unregisterSensor(sensorId);
  }

  registerEventHandler<T>(
    eventHandler: ShareableRef<T>,
    eventName: string,
    emitterReactTag: number
  ) {
    return this.#reanimatedModuleProxy.registerEventHandler(
      eventHandler,
      eventName,
      emitterReactTag
    );
  }

  unregisterEventHandler(id: number) {
    return this.#reanimatedModuleProxy.unregisterEventHandler(id);
  }

  getViewProp<T>(
    viewTag: number,
    propName: string,
    component: React.Component | undefined, // required on Fabric
    callback?: (result: T) => void
  ) {
    let shadowNodeWrapper;
    if (isFabric()) {
      shadowNodeWrapper = getShadowNodeWrapperFromRef(
        component as React.Component
      );
      return this.#reanimatedModuleProxy.getViewProp(
        shadowNodeWrapper,
        propName,
        callback
      );
    }

    return this.#reanimatedModuleProxy.getViewProp(viewTag, propName, callback);
  }

  configureLayoutAnimationBatch(
    layoutAnimationsBatch: LayoutAnimationBatchItem[]
  ) {
    this.#reanimatedModuleProxy.configureLayoutAnimationBatch(
      layoutAnimationsBatch
    );
  }

  setShouldAnimateExitingForTag(viewTag: number, shouldAnimate: boolean) {
    this.#reanimatedModuleProxy.setShouldAnimateExitingForTag(
      viewTag,
      shouldAnimate
    );
  }

  enableLayoutAnimations(flag: boolean) {
    this.#reanimatedModuleProxy.enableLayoutAnimations(flag);
  }

  configureProps(uiProps: string[], nativeProps: string[]) {
    this.#reanimatedModuleProxy.configureProps(uiProps, nativeProps);
  }

  subscribeForKeyboardEvents(
    handler: ShareableRef<number>,
    isStatusBarTranslucent: boolean,
    isNavigationBarTranslucent: boolean
  ) {
    return this.#reanimatedModuleProxy.subscribeForKeyboardEvents(
      handler,
      isStatusBarTranslucent,
      isNavigationBarTranslucent
    );
  }

  unsubscribeFromKeyboardEvents(listenerId: number) {
    this.#reanimatedModuleProxy.unsubscribeFromKeyboardEvents(listenerId);
  }
}
