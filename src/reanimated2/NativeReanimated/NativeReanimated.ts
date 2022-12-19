import { NativeModules } from 'react-native';
import { ShareableRef, ShareableSyncDataHolderRef } from '../commonTypes';
import { LayoutAnimationFunction } from '../layoutReanimation';
import { version as jsVersion } from '../../../package.json';

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
    if (native) {
      this.checkVersion();
    }
  }

  checkVersion(): void {
    const cppVersion = global._REANIMATED_VERSION_CPP;
    const ok = (() => {
      if (
        jsVersion.match(/^\d+\.\d+\.\d+$/) &&
        cppVersion.match(/^\d+\.\d+\.\d+$/)
      ) {
        // x.y.z, compare only major and minor, skip patch
        const [jsMajor, jsMinor] = jsVersion.split('.');
        const [cppMajor, cppMinor] = cppVersion.split('.');
        return jsMajor === cppMajor && jsMinor === cppMinor;
      } else {
        // alpha, beta or rc, compare everything
        return jsVersion === cppVersion;
      }
    })();
    if (!ok) {
      console.error(
        `[Reanimated] Mismatch between JavaScript part and native part of Reanimated (${jsVersion} vs. ${cppVersion}). Did you forget to re-build the app after upgrading react-native-reanimated? If you use Expo Go, you must downgrade to ${cppVersion} which is bundled into Expo SDK.`
      );
      // TODO: detect Expo managed workflow
    }
  }

  getTimestamp(): number {
    throw new Error('stub implementation, used on the web only');
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
    config: ShareableRef<Keyframe | LayoutAnimationFunction>
  ) {
    this.InnerNativeModule.configureLayoutAnimation(viewTag, type, config);
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
