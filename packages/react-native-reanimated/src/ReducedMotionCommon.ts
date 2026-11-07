'use strict';
import { ReduceMotion } from './commonTypes';
import { makeMutable } from './mutables';

export function createReducedMotionManager(isEnabledInSystem: () => boolean) {
  // The overrides mounted now, in mount order; the last one decides.
  const overrides: { readonly mode: ReduceMotion }[] = [];

  function isEnabled(): boolean {
    const mode = overrides[overrides.length - 1]?.mode ?? ReduceMotion.System;
    switch (mode) {
      case ReduceMotion.System:
        return isEnabledInSystem();
      case ReduceMotion.Always:
        return true;
      case ReduceMotion.Never:
        return false;
    }
  }

  function applyEnabled() {
    const enabled = isEnabled();
    manager.jsValue = enabled;
    manager.uiValue.value = enabled;
  }

  const initialValue = isEnabled();
  const manager = {
    jsValue: initialValue,
    uiValue: makeMutable(initialValue),
    handleSystemChange() {
      applyEnabled();
    },
    override(mode: ReduceMotion): () => void {
      const override = { mode };
      overrides.push(override);
      applyEnabled();
      return () => {
        const index = overrides.indexOf(override);
        if (index !== -1) {
          overrides.splice(index, 1);
          applyEnabled();
        }
      };
    },
  };
  return manager;
}
