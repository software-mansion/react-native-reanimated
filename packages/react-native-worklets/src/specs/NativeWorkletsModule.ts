'use strict';

import { type TurboModule, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  installTurboModule: (bundleModeEnabled: boolean) => boolean;
  toggleSlowAnimationsOnUIRuntime: () => boolean;
  start: () => boolean;
}

export default TurboModuleRegistry.get<Spec>('WorkletsModule');
