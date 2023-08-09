import { NativeModules } from 'react-native';
import type {
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

// this is the type of `__reanimatedModuleProxy` which is injected using JSI
export interface NativeReanimatedModule {
  installCoreFunctions(
    callGuard: <T extends Array<unknown>, U>(
      fn: (...args: T) => U,
      ...args: T
    ) => void,
    valueUnpacker: <T>(value: T) => T
  ): void;
  makeShareableClone<T>(
    value: T,
    shouldPersistRemote: boolean
  ): ShareableRef<T>;
  makeSynchronizedDataHolder<T>(
    valueRef: ShareableRef<T>
  ): ShareableSyncDataHolderRef<T>;
  getDataSynchronously<T>(ref: ShareableSyncDataHolderRef<T>): T;
  scheduleOnUI<T>(shareable: ShareableRef<T>): void;
  registerEventHandler<T>(
    eventHash: string,
    eventHandler: ShareableRef<T>
  ): number;
  unregisterEventHandler(id: number): void;
  getViewProp<T>(
    viewTag: string,
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

  installCoreFunctions(
    callGuard: <T extends Array<unknown>, U>(
      fn: (...args: T) => U,
      ...args: T
    ) => void,
    valueUnpacker: <T>(value: T) => T
  ) {
    return this.InnerNativeModule.installCoreFunctions(
      callGuard,
      valueUnpacker
    );
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

  registerEventHandler<T>(eventHash: string, eventHandler: ShareableRef<T>) {
    return this.InnerNativeModule.registerEventHandler(eventHash, eventHandler);
  }

  unregisterEventHandler(id: number) {
    return this.InnerNativeModule.unregisterEventHandler(id);
  }

  getViewProp<T>(
    viewTag: string,
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
