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
        const errors: unknown[] = [];
        manager.listeners.forEach((listener) => {
          try {
            listener();
          } catch (error) {
            errors.push(error);
          }
        });
        if (errors.length) {
          throw errors[0];
        }
      }
    },
  };
  return manager;
}
