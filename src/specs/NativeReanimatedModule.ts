'use strict';
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from './fabricUtils';

interface Spec extends TurboModule {
  installTurboModule: (valueUnpackerCode: string) => boolean;
}

export default TurboModuleRegistry.get<Spec>('ReanimatedModule');
