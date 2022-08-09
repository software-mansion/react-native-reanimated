import { runOnUI } from '../core';

export default interface FrameCallbackRegistryUI {
  frameCallbackRegistry: Map<number, (frameTime: number) => void>;
  frameCallbackActive: Set<number>;
  isFrameCallbackRunning: boolean;
  lastFrameTimestamp: number;
  runCallbacks: () => void;
  registerFrameCallback: (
    callback: (frameTime: number) => void,
    callbackId: number
  ) => void;
  unregisterFrameCallback: (frameCallbackId: number) => void;
  manageStateFrameCallback: (frameCallbackId: number, state: boolean) => void;
}

export const prepareUIRegistry = runOnUI(() => {
  'worklet';

  const frameCallbackRegistry: FrameCallbackRegistryUI = {
    frameCallbackRegistry: new Map<number, (frameTime: number) => void>(),
    frameCallbackActive: new Set<number>(),
    isFrameCallbackRunning: false,
    lastFrameTimestamp: 0,

    runCallbacks() {
      const loop = (timestamp: number) => {
        if (this.lastFrameTimestamp === 0) {
          this.lastFrameTimestamp = timestamp;
        }

        this.frameCallbackActive.forEach((key: number) => {
          const callback = this.frameCallbackRegistry.get(key);
          callback!(timestamp - this.lastFrameTimestamp);
        });

        if (this.frameCallbackActive.size > 0) {
          this.lastFrameTimestamp = timestamp;
          requestAnimationFrame(loop);
        } else {
          this.isFrameCallbackRunning = false;
          this.lastFrameTimestamp = 0;
        }
      };

      if (!this.isFrameCallbackRunning) {
        requestAnimationFrame(loop);
        this.isFrameCallbackRunning = true;
      }
    },

    registerFrameCallback(
      callback: (frameTime: number) => void,
      callbackId: number
    ) {
      this.frameCallbackRegistry.set(callbackId, callback);
    },

    unregisterFrameCallback(frameCallbackId: number) {
      this.manageStateFrameCallback(frameCallbackId, false);
      this.frameCallbackRegistry.delete(frameCallbackId);
    },

    manageStateFrameCallback(frameCallbackId: number, state: boolean) {
      if (frameCallbackId === -1) {
        return;
      }
      if (state) {
        this.frameCallbackActive.add(frameCallbackId);
        this.runCallbacks();
      } else {
        this.frameCallbackActive.delete(frameCallbackId);
      }
    },
  };

  global._frameCallbackRegistry = frameCallbackRegistry;
});
