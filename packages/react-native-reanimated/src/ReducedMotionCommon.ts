'use strict';
import { makeMutable } from './mutables';

export function createReducedMotionManager(initialValue: boolean) {
  const manager = {
    jsValue: initialValue,
    uiValue: makeMutable(initialValue),
    setEnabled(value: boolean) {
      manager.jsValue = value;
      manager.uiValue.value = value;
    },
  };
  return manager;
}
