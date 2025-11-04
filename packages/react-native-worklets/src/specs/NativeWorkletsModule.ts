'use strict';

import { type TurboModule, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  installTurboModule: () => boolean;
}

export default TurboModuleRegistry.get<Spec>('WorkletsModule');
