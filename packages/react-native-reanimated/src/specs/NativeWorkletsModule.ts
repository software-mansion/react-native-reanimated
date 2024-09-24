'use strict';
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// This file would ideally be in `worklets/specs` but
// codegen is pretty stupid and stops looking after first `spec` directory found.

interface Spec extends TurboModule {
  installTurboModule: (valueUnpackerCode: string) => boolean;
}

export default TurboModuleRegistry.get<Spec>('WorkletsModule');
