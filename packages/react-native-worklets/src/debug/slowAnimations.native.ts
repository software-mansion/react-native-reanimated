'use strict';
import { WorkletsModule } from '../WorkletsModule/NativeWorklets';

export function toggleSlowAnimationsOnUIRuntime() {
  WorkletsModule.toggleSlowAnimationsOnUIRuntime();
}
