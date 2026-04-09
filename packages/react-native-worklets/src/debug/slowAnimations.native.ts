'use strict';
import { WorkletsModule } from '../WorkletsModule/NativeWorklets';

/**
 * Toggles slow animations on the UI runtime. When enabled, animations will run
 * at a reduced speed to aid debugging.
 *
 * Available only on Android. iOS offers built-in slow animations toggle.
 *
 * @returns Whether slow animations are now enabled.
 * @throws When invoked on platform different than Android.
 */
export function toggleSlowAnimationsOnUIRuntime(): boolean {
  return WorkletsModule.toggleSlowAnimationsOnUIRuntime();
}
