import { runOnUI } from '../core';

export default interface FrameCallbackRegistryUI {
  frameCallbackRegistry: Map<number, (frameInfo: FrameInfo) => void>;
  frameCallbackStartTime: Map<number, number>;
  frameCallbackActive: Set<number>;
  isFrameCallbackRunning: boolean;
  lastFrameTimestamp: number;
  runCallbacks: () => void;
  registerFrameCallback: (
    callback: (frameInfo: FrameInfo) => void,
    callbackId: number
  ) => void;
  unregisterFrameCallback: (frameCallbackId: number) => void;
  manageStateFrameCallback: (frameCallbackId: number, state: boolean) => void;
}

export type FrameInfo = {
  timestamp: number;
  frameTime: number;
  elapsedTime: number;
};

export const prepareUIRegistry = runOnUI(() => {
  'worklet';

  const frameCallbackRegistry: FrameCallbackRegistryUI = {
    frameCallbackRegistry: new Map<number, (frameInfo: FrameInfo) => void>(),
    frameCallbackStartTime: new Map<number, number>(),
    frameCallbackActive: new Set<number>(),
    isFrameCallbackRunning: false,
    lastFrameTimestamp: 0,

    runCallbacks() {
      const loop = (timestamp: number) => {
        if (this.lastFrameTimestamp === 0) {
          this.lastFrameTimestamp = timestamp;
        }

        const frameTime = timestamp - this.lastFrameTimestamp;

        this.frameCallbackActive.forEach((key: number) => {
          let startTime = this.frameCallbackStartTime.get(key) || 0;
          if (startTime === 0) {
            startTime = timestamp;
            this.frameCallbackStartTime.set(key, timestamp);
          }

          const frameInfo: FrameInfo = {
            timestamp: timestamp,
            frameTime: frameTime,
            elapsedTime: timestamp - startTime,
          };

          const callback = this.frameCallbackRegistry.get(key);
          callback?.call({}, frameInfo);
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
      callback: (frameInfo: FrameInfo) => void,
      callbackId: number
    ) {
      this.frameCallbackRegistry.set(callbackId, callback);
      this.frameCallbackStartTime.set(callbackId, 0);
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
        this.frameCallbackStartTime.set(frameCallbackId, 0);
        this.frameCallbackActive.delete(frameCallbackId);
      }
    },
  };

  global._frameCallbackRegistry = frameCallbackRegistry;
});
