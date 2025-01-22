'use strict';

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// This file has to be explicitly duplicated with Reanimated one
// because all Native Module specs have to be in a common
// `specs` directory.

interface Spec extends TurboModule {
  installTurboModule: (valueUnpackerCode: string) => boolean;
}

export default TurboModuleRegistry.get<Spec>('WorkletsModule');
