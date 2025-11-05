'use strict';
import { scheduleOnUI } from 'react-native-worklets';

import type { FrameInfo } from './FrameCallbackRegistryUI';
import { prepareUIRegistry } from './FrameCallbackRegistryUI';

export default class FrameCallbackRegistryJS {
  private nextCallbackId = 0;

  constructor() {
    prepareUIRegistry();
  }

  registerFrameCallback(callback: (frameInfo: FrameInfo) => void): number {
    if (!callback) {
      return -1;
    }

    const callbackId = this.nextCallbackId;
    this.nextCallbackId++;

    scheduleOnUI(() => {
      global._frameCallbackRegistry.registerFrameCallback(callback, callbackId);
    });

    return callbackId;
  }

  unregisterFrameCallback(callbackId: number): void {
    scheduleOnUI(() => {
      global._frameCallbackRegistry.unregisterFrameCallback(callbackId);
    });
  }

  manageStateFrameCallback(callbackId: number, state: boolean): void {
    scheduleOnUI(() => {
      global._frameCallbackRegistry.manageStateFrameCallback(callbackId, state);
    });
  }
}
