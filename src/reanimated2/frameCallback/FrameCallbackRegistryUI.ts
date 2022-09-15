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
  activeFrameCallbacks: Set<number>;
  previousFrameTimestamp: number | undefined;
  runCallbacks: () => void;
  registerFrameCallback: (
    callback: (frameInfo: FrameInfo) => void,
    callbackId: number
  ) => void;
  unregisterFrameCallback: (callbackId: number) => void;
  manageStateFrameCallback: (callbackId: number, state: boolean) => void;
}

export const prepareUIRegistry = runOnUI(() => {
  'worklet';

  const frameCallbackRegistry: FrameCallbackRegistryUI = {
    frameCallbackRegistry: new Map<number, CallbackDetails>(),
    activeFrameCallbacks: new Set<number>(),
    previousFrameTimestamp: undefined,

    runCallbacks() {
      const loop = (timestamp: number) => {
        if (this.previousFrameTimestamp === undefined) {
          this.previousFrameTimestamp = timestamp;
        }

        const timeSinceLastFrame = timestamp - this.previousFrameTimestamp;

        this.activeFrameCallbacks.forEach((callbackId: number) => {
          const callbackDetails = this.frameCallbackRegistry.get(callbackId)!;

          const { startTime } = callbackDetails;
          const timeSinceFirstFrame = timestamp - (startTime || timestamp);
          const duration =
            startTime === undefined ? undefined : timeSinceLastFrame;

          if (startTime === undefined) {
            callbackDetails.startTime = timestamp;
          }

          callbackDetails.callback({
            timestamp,
            duration,
            timeSinceFirstFrame,
          });
        });

        if (this.activeFrameCallbacks.size > 0) {
          this.previousFrameTimestamp = timestamp;
          requestAnimationFrame(loop);
        } else {
          this.previousFrameTimestamp = undefined;
        }
      };

      // runCallback() should only be called after registering a callback,
      // so if there is only one active callback, then it means that there were
      // zero previously and the loop isn't running yet.
      if (this.activeFrameCallbacks.size === 1) {
        requestAnimationFrame(loop);
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

    unregisterFrameCallback(callbackId: number) {
      this.manageStateFrameCallback(callbackId, false);
      this.frameCallbackRegistry.delete(callbackId);
    },

    manageStateFrameCallback(callbackId: number, state: boolean) {
      if (callbackId === -1) {
        return;
      }
      if (state) {
        this.activeFrameCallbacks.add(callbackId);
        this.runCallbacks();
      } else {
        const callback = this.frameCallbackRegistry.get(callbackId)!;
        callback.startTime = undefined;

        this.activeFrameCallbacks.delete(callbackId);
      }
    },
  };

  global._frameCallbackRegistry = frameCallbackRegistry;
});
