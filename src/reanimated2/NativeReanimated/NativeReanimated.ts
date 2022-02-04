import { SharedValue } from '../commonTypes';
import { Descriptor } from '../hook/commonTypes';

const InnerNativeModule = global.__reanimatedModuleProxy;

export class NativeReanimated {
  native: boolean;
  useOnlyV1: boolean;

  constructor(native = true) {
    this.native = native;
    this.useOnlyV1 = InnerNativeModule === null;
  }

  installCoreFunctions(valueSetter: <T>(value: T) => void): void {
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

  enableLayoutAnimations(flag: boolean): void {
    InnerNativeModule.enableLayoutAnimations(flag);
  }
}
