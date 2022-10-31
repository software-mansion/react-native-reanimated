import { NativeModules } from 'react-native';
import { ShareableRef, ShareableSyncDataHolderRef } from '../commonTypes';

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

  installCoreFunctions(valueUnpacker: <T>(value: T) => T): void {
    return this.InnerNativeModule.installCoreFunctions(valueUnpacker);
  }

  makeShareableClone<T>(value: T): ShareableRef {
    return this.InnerNativeModule.makeShareableClone(value);
  }

  makeSynchronizedDataHolder<T>(value: T): ShareableSyncDataHolderRef<T> {
    return this.InnerNativeModule.makeSynchronizedDataHolder(value);
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

  scheduleOnUI(shareable: ShareableRef) {
    return this.InnerNativeModule.scheduleOnUI(shareable);
  }

  registerSensor(sensorType: number, interval: number, handler: ShareableRef) {
    return this.InnerNativeModule.registerSensor(sensorType, interval, handler);
  }

  unregisterSensor(sensorId: number) {
    return this.InnerNativeModule.unregisterSensor(sensorId);
  }

  registerEventHandler(eventHash: string, eventHandler: ShareableRef): string {
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

  enableLayoutAnimations(flag: boolean): void {
    this.InnerNativeModule.enableLayoutAnimations(flag);
  }

  configureProps(uiProps: string[], nativeProps: string[]): void {
    this.InnerNativeModule.configureProps(uiProps, nativeProps);
  }

  subscribeForKeyboardEvents(handler: ShareableRef): number {
    return this.InnerNativeModule.subscribeForKeyboardEvents(handler);
  }

  unsubscribeFromKeyboardEvents(listenerId: number): void {
    this.InnerNativeModule.unsubscribeFromKeyboardEvents(listenerId);
  }
}
