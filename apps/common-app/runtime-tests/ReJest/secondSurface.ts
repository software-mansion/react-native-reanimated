import type { ComponentType } from 'react';
import type { TurboModule } from 'react-native';
import { AppRegistry, Platform, TurboModuleRegistry } from 'react-native';

interface RuntimeTestsSurfaceModule extends TurboModule {
  start(componentName: string): Promise<number>;
  stop(rootTag: number): Promise<void>;
}

const MODULE_NAME = 'RuntimeTestsSurface';

let registeredComponentsCount = 0;

export function isSecondSurfaceAvailable(): boolean {
  return Platform.OS === 'ios' && getSurfaceModule() !== null;
}

export function startSecondSurface(Component: ComponentType): Promise<number> {
  const componentName = `RuntimeTestsSecondSurface${registeredComponentsCount++}`;
  AppRegistry.registerComponent(componentName, () => Component);
  return getEnforcedSurfaceModule().start(componentName);
}

export function stopSecondSurface(rootTag: number): Promise<void> {
  return getEnforcedSurfaceModule().stop(rootTag);
}

function getEnforcedSurfaceModule(): RuntimeTestsSurfaceModule {
  const surfaceModule = getSurfaceModule();
  if (surfaceModule === null) {
    throw new Error(`The native module ${MODULE_NAME} is not available.`);
  }
  return surfaceModule;
}

function getSurfaceModule(): RuntimeTestsSurfaceModule | null {
  return (
    TurboModuleRegistry.get<RuntimeTestsSurfaceModule>(MODULE_NAME) ?? null
  );
}
