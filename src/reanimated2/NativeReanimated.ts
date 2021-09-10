import { Platform } from 'react-native';
import { AnimationObject } from './animation';
import { PrimitiveValue } from './animation/commonTypes';
import { SharedValue } from './commonTypes';
import { Descriptor } from './hook/commonTypes';
import reanimatedJS from './js-reanimated';
import { nativeShouldBeMock } from './PlatformChecker';

const InnerNativeModule = global.__reanimatedModuleProxy;
export class NativeReanimated {
  native: boolean;
  useOnlyV1: boolean;

  constructor(native = true) {
    this.native = native;
    this.useOnlyV1 = InnerNativeModule === null;
  }

  installCoreFunctions(
    valueSetter: (
      value:
        | (() => AnimationObject)
        | AnimationObject
        | PrimitiveValue
        | Descriptor
    ) => void
  ): void {
    return InnerNativeModule.installCoreFunctions(valueSetter);
  }

  makeShareable<T>(value: T): T {
    return InnerNativeModule.makeShareable(value);
  }

  makeMutable<T>(value: T): SharedValue<T> {
    return InnerNativeModule.makeMutable(value);
  }

  makeRemote<T>(object = {}): T {
    return InnerNativeModule.makeRemote(object);
  }

  startMapper(
    mapper: () => void,
    inputs: any[] = [],
    outputs: any[] = [],
    updater: () => void,
    viewDescriptors: Descriptor[] | SharedValue<Descriptor[]>
  ): number {
    return InnerNativeModule.startMapper(
      mapper,
      inputs,
      outputs,
      updater,
      viewDescriptors
    );
  }

  stopMapper(mapperId: number): void {
    return InnerNativeModule.stopMapper(mapperId);
  }

  registerEventHandler<T>(
    eventHash: string,
    eventHandler: (event: T) => void
  ): string {
    return InnerNativeModule.registerEventHandler(eventHash, eventHandler);
  }

  unregisterEventHandler(id: string): void {
    return InnerNativeModule.unregisterEventHandler(id);
  }

  getViewProp<T>(
    viewTag: string,
    propName: string,
    callback?: (result: T) => void
  ): Promise<T> {
    return InnerNativeModule.getViewProp(viewTag, propName, callback);
  }
}

let exportedModule;
if (nativeShouldBeMock()) {
  exportedModule = reanimatedJS;
} else {
  exportedModule = new NativeReanimated();
  if (exportedModule.useOnlyV1 && Platform.OS === 'android') {
    console.warn(
      `If you want to use Reanimated 2 then go through our installation steps https://docs.swmansion.com/react-native-reanimated/docs/installation`
    );
  }
}

export default exportedModule as NativeReanimated;
