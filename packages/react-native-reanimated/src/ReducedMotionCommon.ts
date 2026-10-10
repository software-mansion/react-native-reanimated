'use strict';
import { makeMutable } from './mutables';

export function createReducedMotionManager(initialValue: boolean) {
  const manager = {
    jsValue: initialValue,
    uiValue: makeMutable(initialValue),
    followsSystem: true,
    setEnabled(value: boolean) {
      manager.jsValue = value;
      manager.uiValue.value = value;
    },
    applySystemChange(value: boolean) {
      if (manager.followsSystem) {
        manager.setEnabled(value);
      }
    },
  };
  return manager;
}
