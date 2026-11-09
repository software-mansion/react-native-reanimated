'use strict';
import { makeMutable } from './mutables';

export function createReducedMotionManager(initialValue: boolean) {
  const manager = {
    jsValue: initialValue,
    uiValue: makeMutable(initialValue),
    listeners: new Set<() => void>(),
    setEnabled(value: boolean) {
      const changed = manager.jsValue !== value;
      manager.jsValue = value;
      manager.uiValue.value = value;
      if (changed) {
        manager.listeners.forEach((listener) => listener());
      }
    },
  };
  return manager;
}
