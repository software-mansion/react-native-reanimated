import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

interface Spec extends TurboModule {
  readonly installBridgeless: (valueUnpackerCode: string) => boolean;
}

export default TurboModuleRegistry.get<Spec>('REATurboCppModule');
