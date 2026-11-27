'use strict';
import { scheduleOnUI } from 'react-native-worklets';

import type { FrameInfo } from './commonTypes';
import { prepareUIRegistry } from './FrameCallbackRegistryUI';

function registerFrameCallbackOnUI(
  callback: (frameInfo: FrameInfo) => void,
  callbackId: number
): void {
  'worklet';
  global._frameCallbackRegistry.registerFrameCallback(callback, callbackId);
}

function unregisterFrameCallbackOnUI(callbackId: number): void {
  'worklet';
  global._frameCallbackRegistry.unregisterFrameCallback(callbackId);
}

function manageStateFrameCallbackOnUI(
  callbackId: number,
  state: boolean
): void {
  'worklet';
  global._frameCallbackRegistry.manageStateFrameCallback(callbackId, state);
}

export default class FrameCallbackRegistryJS {
  private nextCallbackId = 0;

  constructor() {
    scheduleOnUI(prepareUIRegistry);
  }

  registerFrameCallback(callback: (frameInfo: FrameInfo) => void): number {
    if (!callback) {
      return -1;
    }

    const callbackId = this.nextCallbackId;
    this.nextCallbackId++;

    scheduleOnUI(registerFrameCallbackOnUI, callback, callbackId);

    return callbackId;
  }

  unregisterFrameCallback(callbackId: number): void {
    scheduleOnUI(unregisterFrameCallbackOnUI, callbackId);
  }

  manageStateFrameCallback(callbackId: number, state: boolean): void {
    scheduleOnUI(manageStateFrameCallbackOnUI, callbackId, state);
  }
}
