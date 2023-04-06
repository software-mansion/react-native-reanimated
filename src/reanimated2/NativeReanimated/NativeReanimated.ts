import { NativeModules } from 'react-native';
import {
  SensorConfig,
  SensorType,
  ShareableRef,
  ShareableSyncDataHolderRef,
} from '../commonTypes';
import {
  LayoutAnimationFunction,
  LayoutAnimationType,
} from '../layoutReanimation';
import { NativeSensor } from '../NativeSensor';
import { checkVersion } from '../platform-specific/checkVersion';

export class NativeReanimated {
  native: boolean;
  private InnerNativeModule: any;
  private nativeSensors: Map<string, NativeSensor> = new Map()

  constructor(native = true) {
    if (global.__reanimatedModuleProxy === undefined && native) {
      const { ReanimatedModule } = NativeModules;
      ReanimatedModule?.installTurboModule();
    }
    this.InnerNativeModule = global.__reanimatedModuleProxy;
    this.native = native;
    if (native) {
      if (this.InnerNativeModule === undefined) {
        console.error(
          `[Reanimated] The native part of Reanimated doesn't seem to be initialized. This could be caused by\n\
  - not rebuilding the app after installing or upgrading Reanimated\n\
  - trying to run Reanimated on an unsupported platform\n\
  - running in a brownfield app without manually initializing the native library`
        );
        return;
      }
      checkVersion();
    }
  }

  installCoreFunctions(
    callGuard: <T extends Array<any>, U>(
      fn: (...args: T) => U,
      ...args: T
    ) => void,
    valueUnpacker: <T>(value: T) => T
  ): void {
    return this.InnerNativeModule.installCoreFunctions(
      callGuard,
      valueUnpacker
    );
  }

  makeShareableClone<T>(
    value: T,
    shouldPersistRemote: boolean
  ): ShareableRef<T> {
    return this.InnerNativeModule.makeShareableClone(
      value,
      shouldPersistRemote
    );
  }

  makeSynchronizedDataHolder<T>(
    valueRef: ShareableRef<T>
  ): ShareableSyncDataHolderRef<T> {
    return this.InnerNativeModule.makeSynchronizedDataHolder(valueRef);
  }

  getDataSynchronously<T>(ref: ShareableSyncDataHolderRef<T>): T {
    return this.InnerNativeModule.getDataSynchronously(ref);
  }

  updateDataSynchronously<T>(
    ref: ShareableSyncDataHolderRef<T>,
    value: T
  ): void {
    this.InnerNativeModule.updateDataSynchronously(ref, value);
  }

  scheduleOnUI<T>(shareable: ShareableRef<T>) {
    return this.InnerNativeModule.scheduleOnUI(shareable);
  }

  getSensorKey(sensorType: SensorType, config: SensorConfig) {
    return sensorType.toString() + JSON.stringify(config);
  }

  registerSensor(
    sensorType: SensorType,
    sensorRef: React.MutableRefObject<any>,
  ) {
    const config = sensorRef.current.config;
    const configKey = this.getSensorKey(sensorType, config);

    if (!this.nativeSensors.has(configKey)) {
      const newSensor = new NativeSensor(sensorType, this.InnerNativeModule, config);
      this.nativeSensors.set(configKey, newSensor)
    }

    const sensor = this.nativeSensors?.get(configKey);
    if (!sensor?.isRunning()) {
      if (!sensor?.initialize()) {
        return -1;
      }
    }
    sensorRef.current.sensor = sensor.getSharedValue();
    sensor.addListener();
    return sensor.getId();
  }

  unregisterSensor(sensorType: SensorType, config: SensorConfig, sensorId: number) {
    const configKey = this.getSensorKey(sensorType, config); 

    if (this.nativeSensors.has(configKey)) {
      const sensor = this.nativeSensors.get(configKey);
      sensor?.removeListener();

      if (!sensor?.hasActiveListeners()) {
        sensor?.unregister();
      }
    }
  }

  registerEventHandler<T>(
    eventHash: string,
    eventHandler: ShareableRef<T>
  ): string {
    return this.InnerNativeModule.registerEventHandler(eventHash, eventHandler);
  }

  unregisterEventHandler(id: string): void {
    return this.InnerNativeModule.unregisterEventHandler(id);
  }

  getViewProp<T>(
    viewTag: string,
    propName: string,
    callback?: (result: T) => void
  ): Promise<T> {
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

  enableLayoutAnimations(flag: boolean): void {
    this.InnerNativeModule.enableLayoutAnimations(flag);
  }

  configureProps(uiProps: string[], nativeProps: string[]): void {
    this.InnerNativeModule.configureProps(uiProps, nativeProps);
  }

  subscribeForKeyboardEvents(
    handler: ShareableRef<number>,
    isStatusBarTranslucent: boolean
  ): number {
    return this.InnerNativeModule.subscribeForKeyboardEvents(
      handler,
      isStatusBarTranslucent
    );
  }

  unsubscribeFromKeyboardEvents(listenerId: number): void {
    this.InnerNativeModule.unsubscribeFromKeyboardEvents(listenerId);
  }
}
