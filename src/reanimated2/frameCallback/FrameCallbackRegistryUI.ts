import { runOnUI } from '../core';

type CallbackDetails = {
  callback: (frameTimings: FrameTime) => void;
  startTime: number | undefined;
};

interface FrameCallbackRegistryUI {
  frameCallbackRegistry: Map<number, CallbackDetails>;
  frameCallbackActive: Set<number>;
  isFrameCallbackRunning: boolean;
  lastFrameTimestamp: number | undefined;
  runCallbacks: () => void;
  registerFrameCallback: (
    callback: (frameTimings: FrameTime) => void,
    callbackId: number
  ) => void;
  unregisterFrameCallback: (frameCallbackId: number) => void;
  manageStateFrameCallback: (frameCallbackId: number, state: boolean) => void;
}

export type FrameTime = {
  timestamp: number;
  duration: number | undefined;
  elapsedTime: number;
};

export const prepareUIRegistry = runOnUI(() => {
  'worklet';

  const frameCallbackRegistry: FrameCallbackRegistryUI = {
    frameCallbackRegistry: new Map<number, CallbackDetails>(),
    frameCallbackActive: new Set<number>(),
    isFrameCallbackRunning: false,
    lastFrameTimestamp: undefined,

    runCallbacks() {
      const loop = (timestamp: number) => {
        if (this.lastFrameTimestamp === undefined) {
          this.lastFrameTimestamp = timestamp;
        }

        const timeSinceLastFrame = timestamp - this.lastFrameTimestamp;

        this.frameCallbackActive.forEach((key: number) => {
          const startTime = this.frameCallbackRegistry.get(key)?.startTime;
          const elapsedTime = timestamp - (startTime || timestamp);
          const duration =
            startTime === undefined ? undefined : timeSinceLastFrame;

          if (startTime === undefined) {
            const callbackDetails = this.frameCallbackRegistry.get(key)!;
            callbackDetails.startTime = timestamp;

            this.frameCallbackRegistry.set(key, callbackDetails);
          }

          const callbackDetails = this.frameCallbackRegistry.get(key);
          callbackDetails?.callback.call(
            {},
            { timestamp, elapsedTime, duration }
          );
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
      callback: (frameTimings: FrameTime) => void,
      callbackId: number
    ) {
      this.frameCallbackRegistry.set(callbackId, {
        callback,
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
        const callbackDetails =
          this.frameCallbackRegistry.get(frameCallbackId)!;
        callbackDetails.startTime = undefined;

        this.frameCallbackActive.delete(frameCallbackId);
        this.frameCallbackRegistry.set(frameCallbackId, callbackDetails);
      }
    },
  };

  global._frameCallbackRegistry = frameCallbackRegistry;
});
