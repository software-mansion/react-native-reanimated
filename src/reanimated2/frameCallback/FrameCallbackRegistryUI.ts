import { runOnUI } from '../core';

type CallbackDetails = {
  callback: (frameInfo: FrameInfo) => void;
  startTime: number | undefined;
};

export type FrameInfo = {
  timestamp: number;
  duration: number | undefined;
  timeSinceFirstFrame: number;
};

interface FrameCallbackRegistryUI {
  frameCallbackRegistry: Map<number, CallbackDetails>;
  frameCallbackActive: Set<number>;
  isFrameCallbackRunning: boolean;
  previousFrameTimestamp: number | undefined;
  runCallbacks: () => void;
  registerFrameCallback: (
    callback: (frameInfo: FrameInfo) => void,
    callbackId: number
  ) => void;
  unregisterFrameCallback: (frameCallbackId: number) => void;
  manageStateFrameCallback: (frameCallbackId: number, state: boolean) => void;
}

export const prepareUIRegistry = runOnUI(() => {
  'worklet';

  const frameCallbackRegistry: FrameCallbackRegistryUI = {
    frameCallbackRegistry: new Map<number, CallbackDetails>(),
    frameCallbackActive: new Set<number>(),
    isFrameCallbackRunning: false,
    previousFrameTimestamp: undefined,

    runCallbacks() {
      const loop = (timestamp: number) => {
        if (this.previousFrameTimestamp === undefined) {
          this.previousFrameTimestamp = timestamp;
        }

        const timeSinceLastFrame = timestamp - this.previousFrameTimestamp;

        this.frameCallbackActive.forEach((key: number) => {
          const callback = this.frameCallbackRegistry.get(key)!;

          const startTime = callback.startTime;
          const timeSinceFirstFrame = timestamp - (startTime || timestamp);
          const duration =
            startTime === undefined ? undefined : timeSinceLastFrame;

          if (startTime === undefined) {
            callback.startTime = timestamp;
          }

          callback.callback({
            timestamp,
            duration,
            timeSinceFirstFrame,
          });
        });

        if (this.frameCallbackActive.size > 0) {
          this.previousFrameTimestamp = timestamp;
          requestAnimationFrame(loop);
        } else {
          this.isFrameCallbackRunning = false;
          this.previousFrameTimestamp = undefined;
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
      this.frameCallbackRegistry.set(callbackId, {
        callback: callback,
        startTime: undefined,
      });
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
        const callback = this.frameCallbackRegistry.get(frameCallbackId)!;
        callback.startTime = undefined;

        this.frameCallbackActive.delete(frameCallbackId);
      }
    },
  };

  global._frameCallbackRegistry = frameCallbackRegistry;
});
