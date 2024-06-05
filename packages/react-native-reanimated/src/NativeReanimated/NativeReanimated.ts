'use strict';
import type {
  ShadowNodeWrapper,
  Value3D,
  ValueRotation,
  ShareableRef,
} from '../commonTypes';
import { checkCppVersion } from '../platform-specific/checkCppVersion';
import { jsVersion } from '../platform-specific/jsVersion';
import type { WorkletRuntime } from '../runtimes';
import { getValueUnpackerCode } from '../valueUnpacker';
import { isFabric } from '../PlatformChecker';
import type React from 'react';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import type { LayoutAnimationBatchItem } from '../layoutReanimation/animationBuilder/commonTypes';
import ReanimatedModule from '../specs/NativeReanimatedModule';

// this is the type of `__reanimatedModuleProxy` which is injected using JSI
export interface NativeReanimatedModule {
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
    isStatusBarTranslucent: boolean
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
    throw new Error(
      `[Reanimated] Another instance of Reanimated was detected.
See \`https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#another-instance-of-reanimated-was-detected\` for more details. Previous: ${global._REANIMATED_VERSION_JS}, current: ${jsVersion}.`
    );
  }
}

export class NativeReanimated {
  private InnerNativeModule: NativeReanimatedModule;

  constructor() {
    // These checks have to split since version checking depend on the execution order
    if (__DEV__) {
      assertSingleReanimatedInstance();
    }
    global._REANIMATED_VERSION_JS = jsVersion;
    if (global.__reanimatedModuleProxy === undefined) {
      const valueUnpackerCode = getValueUnpackerCode();
      ReanimatedModule?.installTurboModule(valueUnpackerCode);
    }
    if (global.__reanimatedModuleProxy === undefined) {
      throw new Error(
        `[Reanimated] Native part of Reanimated doesn't seem to be initialized.
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#native-part-of-reanimated-doesnt-seem-to-be-initialized for more details.`
      );
    }
    if (__DEV__) {
      checkCppVersion();
    }
    this.InnerNativeModule = global.__reanimatedModuleProxy;
  }

  makeShareableClone<T>(
    value: T,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ) {
    return this.InnerNativeModule.makeShareableClone(
      value,
      shouldPersistRemote,
      nativeStateSource
    );
  }

  scheduleOnUI<T>(shareable: ShareableRef<T>) {
    return this.InnerNativeModule.scheduleOnUI(shareable);
  }

  executeOnUIRuntimeSync<T, R>(shareable: ShareableRef<T>): R {
    return this.InnerNativeModule.executeOnUIRuntimeSync(shareable);
  }

  createWorkletRuntime(name: string, initializer: ShareableRef<() => void>) {
    return this.InnerNativeModule.createWorkletRuntime(name, initializer);
  }

  scheduleOnRuntime<T>(
    workletRuntime: WorkletRuntime,
    shareableWorklet: ShareableRef<T>
  ) {
    return this.InnerNativeModule.scheduleOnRuntime(
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
    return this.InnerNativeModule.registerSensor(
      sensorType,
      interval,
      iosReferenceFrame,
      handler
    );
  }

  unregisterSensor(sensorId: number) {
    return this.InnerNativeModule.unregisterSensor(sensorId);
  }

  registerEventHandler<T>(
    eventHandler: ShareableRef<T>,
    eventName: string,
    emitterReactTag: number
  ) {
    return this.InnerNativeModule.registerEventHandler(
      eventHandler,
      eventName,
      emitterReactTag
    );
  }

  unregisterEventHandler(id: number) {
    return this.InnerNativeModule.unregisterEventHandler(id);
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
      return this.InnerNativeModule.getViewProp(
        shadowNodeWrapper,
        propName,
        callback
      );
    }

    return this.InnerNativeModule.getViewProp(viewTag, propName, callback);
  }

  configureLayoutAnimationBatch(
    layoutAnimationsBatch: LayoutAnimationBatchItem[]
  ) {
    this.InnerNativeModule.configureLayoutAnimationBatch(layoutAnimationsBatch);
  }

  setShouldAnimateExitingForTag(viewTag: number, shouldAnimate: boolean) {
    this.InnerNativeModule.setShouldAnimateExitingForTag(
      viewTag,
      shouldAnimate
    );
  }

  enableLayoutAnimations(flag: boolean) {
    this.InnerNativeModule.enableLayoutAnimations(flag);
  }

  configureProps(uiProps: string[], nativeProps: string[]) {
    this.InnerNativeModule.configureProps(uiProps, nativeProps);
  }

  subscribeForKeyboardEvents(
    handler: ShareableRef<number>,
    isStatusBarTranslucent: boolean
  ) {
    return this.InnerNativeModule.subscribeForKeyboardEvents(
      handler,
      isStatusBarTranslucent
    );
  }

  unsubscribeFromKeyboardEvents(listenerId: number) {
    this.InnerNativeModule.unsubscribeFromKeyboardEvents(listenerId);
  }
}
