'use strict';
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

interface Spec extends TurboModule {}

export default TurboModuleRegistry.get<Spec>('ReanimatedModule');
