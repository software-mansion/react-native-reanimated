import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  readonly getCount: () => number;
}

export default TurboModuleRegistry.getEnforcing<Spec>('PolledCounter');
