import { NativeModules } from 'react-native';
import {
  SharedValue,
  SensorValue3D,
  SensorValueRotation,
  AnimatedKeyboardInfo,
} from '../commonTypes';
import { Descriptor } from '../hook/commonTypes';
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

  installCoreFunctions(valueSetter: <T>(value: T) => void): void {
    return this.InnerNativeModule.installCoreFunctions(valueSetter);
  }

  makeShareable<T>(value: T): T {
    return this.InnerNativeModule.makeShareable(value);
  }

  makeMutable<T>(value: T): SharedValue<T> {
    return this.InnerNativeModule.makeMutable(value);
  }

  makeRemote<T>(object = {}): T {
    return this.InnerNativeModule.makeRemote(object);
  }

  registerSensor(
    sensorType: number,
    interval: number,
    sensorData: SensorValue3D | SensorValueRotation
  ) {
    return this.InnerNativeModule.registerSensor(
      sensorType,
      interval,
      sensorData
    );
  }

  unregisterSensor(sensorId: number) {
    return this.InnerNativeModule.unregisterSensor(sensorId);
  }

  startMapper(
    mapper: () => void,
    inputs: any[] = [],
    outputs: any[] = [],
    updater: () => void,
    viewDescriptors: Descriptor[] | SharedValue<Descriptor[]>
  ): number {
    return this.InnerNativeModule.startMapper(
      mapper,
      inputs,
      outputs,
      updater,
      viewDescriptors
    );
  }

  stopMapper(mapperId: number): void {
    return this.InnerNativeModule.stopMapper(mapperId);
  }

  registerEventHandler<T>(
    eventHash: string,
    eventHandler: (event: T) => void
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

  subscribeForKeyboardEvents(keyboardEventData: AnimatedKeyboardInfo): number {
    return this.InnerNativeModule.subscribeForKeyboardEvents(keyboardEventData);
  }

  unsubscribeFromKeyboardEvents(listenerId: number): void {
    this.InnerNativeModule.unsubscribeFromKeyboardEvents(listenerId);
  }
}
