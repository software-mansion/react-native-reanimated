import { NativeModules } from 'react-native';
import type {
  ComplexWorkletFunction,
  ShareableRef,
  ShareableSyncDataHolderRef,
  Value3D,
  ValueRotation,
} from '../commonTypes';
import type {
  LayoutAnimationFunction,
  LayoutAnimationType,
} from '../layoutReanimation';
import { checkCppVersion } from '../platform-specific/checkCppVersion';
import { WorkletRuntime } from '../runtimes';

// this is the type of `__reanimatedModuleProxy` which is injected using JSI
export interface NativeReanimatedModule {
  installValueUnpacker(valueUnpackerCode: string): void;
  makeShareableClone<T>(
    value: T,
    shouldPersistRemote: boolean
  ): ShareableRef<T>;
  makeSynchronizedDataHolder<T>(
    valueRef: ShareableRef<T>
  ): ShareableSyncDataHolderRef<T>;
  getDataSynchronously<T>(ref: ShareableSyncDataHolderRef<T>): T;
  scheduleOnUI<T>(shareable: ShareableRef<T>): void;
  scheduleOnBackground<T>(
    runtime: WorkletRuntime,
    shareable: ShareableRef<T>
  ): void;
  createWorkletRuntime(name: string, valueUnpackerCode: string): WorkletRuntime;
  runOnWorkletRuntimeSyncUnsafe(
    runtime: WorkletRuntime,
    worklet: ShareableRef<ComplexWorkletFunction<[], void>>
  ): void;
  registerEventHandler<T>(
    eventHandler: ShareableRef<T>,
    eventName: string,
    emitterReactTag: number
  ): number;
  unregisterEventHandler(id: number): void;
  getViewProp<T>(
    viewTag: number,
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
  configureLayoutAnimation(
    viewTag: number,
    type: LayoutAnimationType,
    sharedTransitionTag: string,
    config: ShareableRef<Keyframe | LayoutAnimationFunction>
  ): void;
}

export class NativeReanimated {
  native = true;
  private InnerNativeModule: NativeReanimatedModule;

  constructor() {
    if (global.__reanimatedModuleProxy === undefined) {
      const { ReanimatedModule } = NativeModules;
      ReanimatedModule?.installTurboModule();
    }
    if (global.__reanimatedModuleProxy === undefined) {
      throw new Error(
        `[Reanimated] The native part of Reanimated doesn't seem to be initialized. This could be caused by\n\
- not rebuilding the app after installing or upgrading Reanimated\n\
- trying to run Reanimated on an unsupported platform\n\
- running in a brownfield app without manually initializing the native library`
      );
    }
    checkCppVersion();
    this.InnerNativeModule = global.__reanimatedModuleProxy;
  }

  installValueUnpacker(valueUnpackerCode: string): void {
    return this.InnerNativeModule.installValueUnpacker(valueUnpackerCode);
  }

  makeShareableClone<T>(value: T, shouldPersistRemote: boolean) {
    return this.InnerNativeModule.makeShareableClone(
      value,
      shouldPersistRemote
    );
  }

  makeSynchronizedDataHolder<T>(valueRef: ShareableRef<T>) {
    return this.InnerNativeModule.makeSynchronizedDataHolder(valueRef);
  }

  getDataSynchronously<T>(ref: ShareableSyncDataHolderRef<T>) {
    return this.InnerNativeModule.getDataSynchronously(ref);
  }

  scheduleOnUI<T>(shareable: ShareableRef<T>) {
    return this.InnerNativeModule.scheduleOnUI(shareable);
  }

  scheduleOnBackground<T>(runtime: WorkletRuntime, worklet: ShareableRef<T>) {
    return this.InnerNativeModule.scheduleOnBackground(runtime, worklet);
  }

  createWorkletRuntime(name: string, valueUnpackerCode: string) {
    return this.InnerNativeModule.createWorkletRuntime(name, valueUnpackerCode);
  }

  runOnWorkletRuntimeSyncUnsafe(
    runtime: WorkletRuntime,
    worklet: ShareableRef<ComplexWorkletFunction<[], void>>
  ) {
    return this.InnerNativeModule.runOnWorkletRuntimeSyncUnsafe(
      runtime,
      worklet
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
    callback?: (result: T) => void
  ) {
    return this.InnerNativeModule.getViewProp(viewTag, propName, callback);
  }

  configureLayoutAnimation(
    viewTag: number,
    type: LayoutAnimationType,
    sharedTransitionTag: string,
    config: ShareableRef<Keyframe | LayoutAnimationFunction>
  ) {
    this.InnerNativeModule.configureLayoutAnimation(
      viewTag,
      type,
      sharedTransitionTag,
      config
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
