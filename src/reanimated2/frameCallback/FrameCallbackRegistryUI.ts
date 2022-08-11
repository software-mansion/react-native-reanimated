import { runOnUI } from '../core';

export default interface FrameCallbackRegistryUI {
  frameCallbackRegistry: Map<number, (frameTimings: FrameTimings) => void>;
  frameCallbackStartTime: Map<number, number>;
  frameCallbackActive: Set<number>;
  isFrameCallbackRunning: boolean;
  lastFrameTimestamp: number;
  runCallbacks: () => void;
  registerFrameCallback: (
    callback: (frameTimings: FrameTimings) => void,
    callbackId: number
  ) => void;
  unregisterFrameCallback: (frameCallbackId: number) => void;
  manageStateFrameCallback: (frameCallbackId: number, state: boolean) => void;
}

export type FrameTimings = {
  timestamp: number;
  timeSinceLastFrame: number | null;
  elapsedTime: number;
};

export const prepareUIRegistry = runOnUI(() => {
  'worklet';

  const frameCallbackRegistry: FrameCallbackRegistryUI = {
    frameCallbackRegistry: new Map<
      number,
      (frameTimings: FrameTimings) => void
    >(),
    frameCallbackStartTime: new Map<number, number>(),
    frameCallbackActive: new Set<number>(),
    isFrameCallbackRunning: false,
    lastFrameTimestamp: 0,

    runCallbacks() {
      const loop = (timestamp: number) => {
        if (this.lastFrameTimestamp === 0) {
          this.lastFrameTimestamp = timestamp;
        }

        const timeSinceLastFrame = timestamp - this.lastFrameTimestamp;

        this.frameCallbackActive.forEach((key: number) => {
          const startTime = this.frameCallbackStartTime.get(key);

          const frameTimings: FrameTimings = {
            timestamp,
            elapsedTime: timestamp - (startTime || timestamp),
            timeSinceLastFrame:
              startTime === undefined ? null : timeSinceLastFrame,
          };

          if (startTime === undefined) {
            this.frameCallbackStartTime.set(key, timestamp);
          }

          const callback = this.frameCallbackRegistry.get(key);
          callback?.call({}, frameTimings);
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
      callback: (frameTimings: FrameTimings) => void,
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
        this.frameCallbackStartTime.delete(frameCallbackId);
      }
    },
  };

  global._frameCallbackRegistry = frameCallbackRegistry;
});
