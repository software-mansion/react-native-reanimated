'use strict';

import { runOnUI } from 'react-native-worklets';
import { prepareUIRegistry } from "./FrameCallbackRegistryUI.js";
export default class FrameCallbackRegistryJS {
  nextCallbackId = 0;
  constructor() {
    prepareUIRegistry();
  }
  registerFrameCallback(callback) {
    if (!callback) {
      return -1;
    }
    const callbackId = this.nextCallbackId;
    this.nextCallbackId++;
    runOnUI(() => {
      global._frameCallbackRegistry.registerFrameCallback(callback, callbackId);
    })();
    return callbackId;
  }
  unregisterFrameCallback(callbackId) {
    runOnUI(() => {
      global._frameCallbackRegistry.unregisterFrameCallback(callbackId);
    })();
  }
  manageStateFrameCallback(callbackId, state) {
    runOnUI(() => {
      global._frameCallbackRegistry.manageStateFrameCallback(callbackId, state);
    })();
  }
}
//# sourceMappingURL=FrameCallbackRegistryJS.js.map