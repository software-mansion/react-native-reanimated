'use strict';
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// ts-prune-ignore-next False positive. Required for TypeScript compilation.
export interface Spec extends TurboModule {
  installTurboModule: () => boolean;
}

export default TurboModuleRegistry.get<Spec>('WorkletsModule');
