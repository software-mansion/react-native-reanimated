'use strict';
import { WorkletsModule } from '../WorkletsModule/NativeWorklets';

/**
 * Toggles slow animations on the UI runtime. When enabled, animations will
 * run at a reduced speed to aid debugging.
 *
 * @returns Whether slow animations are now enabled.
 */
export function toggleSlowAnimationsOnUIRuntime(): boolean {
  return WorkletsModule.toggleSlowAnimationsOnUIRuntime();
}
