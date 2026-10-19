import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Sets the slow-animation drag of Reanimated through its dev-menu item: the
 * test-host module of the Android runtime-test app
 * (`RuntimeTestsSlowAnimationsModule.kt`).
 */
interface RuntimeTestsSlowAnimationsModule extends TurboModule {
  setEnabled(enabled: boolean): Promise<void>;
}

const MODULE_NAME = 'RuntimeTestsSlowAnimations';

/** With the drag, the Reanimated clock runs at 1 / 10 of the uptime. */
export const SLOW_ANIMATIONS_DRAG = 10;

export function setSlowAnimations(enabled: boolean): Promise<void> {
  const slowAnimationsModule =
    TurboModuleRegistry.get<RuntimeTestsSlowAnimationsModule>(MODULE_NAME);
  if (!slowAnimationsModule) {
    throw new Error(`The native module ${MODULE_NAME} is not available.`);
  }
  return slowAnimationsModule.setEnabled(enabled);
}
