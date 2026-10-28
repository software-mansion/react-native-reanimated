import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  install: (runtime: CodegenTypes.UnsafeObject) => boolean;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeExample');
