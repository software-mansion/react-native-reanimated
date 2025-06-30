'use strict';
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/** @knipIgnore False positive. Required for TypeScript compilation. */
export interface Spec extends TurboModule {
  installTurboModule: () => boolean;
}

export default TurboModuleRegistry.get<Spec>('WorkletsModule');
