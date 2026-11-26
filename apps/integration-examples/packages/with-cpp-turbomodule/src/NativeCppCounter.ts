import {
  TurboModuleRegistry,
  type CodegenTypes,
  type TurboModule,
} from 'react-native';

export interface Spec extends TurboModule {
  getCount(): number;
  addWorkletListener(
    uiRuntimeHolder: CodegenTypes.UnsafeObject,
    uiSchedulerHolder: CodegenTypes.UnsafeObject,
    worklet: CodegenTypes.UnsafeObject
  ): CodegenTypes.Int32;
  removeWorkletListener(id: CodegenTypes.Int32): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CppCounter');
