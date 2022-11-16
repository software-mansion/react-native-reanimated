import { NativeModules } from 'react-native';
import { ShareableRef, ShareableSyncDataHolderRef } from '../commonTypes';
import { SharedValue } from '../commonTypes';
import { LayoutAnimationFunction } from '../layoutReanimation';

export class NativeReanimated {
  native: boolean;
  private InnerNativeModule: any;

  constructor(native = true) {
    if (global.__reanimatedModuleProxy === undefined && native) {
      const { ReanimatedModule } = NativeModules;
      ReanimatedModule?.installTurboModule();
    }
    this.InnerNativeModule = global.__reanimatedModuleProxy;
    this.native = native;
  }

  getTimestamp(): number {
    throw new Error('stub implementation, used on the web only');
  }

  installCoreFunctions(valueUnpacker: <T>(value: T) => T): void {
    return this.InnerNativeModule.installCoreFunctions(valueUnpacker);
  }

  makeShareableClone<T>(value: T): ShareableRef<T> {
    return this.InnerNativeModule.makeShareableClone(value);
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

  registerSensor<T>(
    sensorType: number,
    interval: number,
    handler: ShareableRef<T>
  ) {
    return this.InnerNativeModule.registerSensor(sensorType, interval, handler);
  }

  unregisterSensor(sensorId: number) {
    return this.InnerNativeModule.unregisterSensor(sensorId);
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
    type: string,
    config: Keyframe | LayoutAnimationFunction,
    viewSharedValue: SharedValue<null | Record<string, unknown>> | null
  ) {
    this.InnerNativeModule.configureLayoutAnimation(
      viewTag,
      type,
      config,
      viewSharedValue
    );
  }

  enableLayoutAnimations(flag: boolean): void {
    this.InnerNativeModule.enableLayoutAnimations(flag);
  }

  configureProps(uiProps: string[], nativeProps: string[]): void {
    this.InnerNativeModule.configureProps(uiProps, nativeProps);
  }

  subscribeForKeyboardEvents(handler: ShareableRef<number>): number {
    return this.InnerNativeModule.subscribeForKeyboardEvents(handler);
  }

  unsubscribeFromKeyboardEvents(listenerId: number): void {
    this.InnerNativeModule.unsubscribeFromKeyboardEvents(listenerId);
  }
}
