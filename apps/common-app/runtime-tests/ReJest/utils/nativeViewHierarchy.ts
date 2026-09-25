import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Test-only module of the runtime-tests builds of fabric-example.
interface RuntimeTestsViewHierarchy extends TurboModule {
  isViewMounted(tag: number): Promise<boolean>;
}

export function isViewMountedNatively(tag: number) {
  return TurboModuleRegistry.getEnforcing<RuntimeTestsViewHierarchy>(
    'RuntimeTestsViewHierarchy'
  ).isViewMounted(tag);
}
