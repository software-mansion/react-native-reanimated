import { runOnUI } from '../core';

type Callback = {
  // What about calling this field `call`? Then we would have `callback.call()`.
  // It looks nice, but arguably it is confusing, as `call` isn't actually a
  // function, but rather a function object. -> discuss this with someone
  function: (callbackDetails: CallbackDetails) => void;
  startTime: number | undefined;
};

export type CallbackDetails = {
  lastFrameTimestamp: number;
  lastFrameDuration: number | undefined;
  elapsedTime: number;
};

interface FrameCallbackRegistryUI {
  frameCallbackRegistry: Map<number, Callback>;
  frameCallbackActive: Set<number>;
  isFrameCallbackRunning: boolean;
  previousFrameTimestamp: number | undefined;
  runCallbacks: () => void;
  registerFrameCallback: (
    callback: (callbackDetails: CallbackDetails) => void,
    callbackId: number
  ) => void;
  unregisterFrameCallback: (frameCallbackId: number) => void;
  manageStateFrameCallback: (frameCallbackId: number, state: boolean) => void;
}

export const prepareUIRegistry = runOnUI(() => {
  'worklet';

  const frameCallbackRegistry: FrameCallbackRegistryUI = {
    frameCallbackRegistry: new Map<number, Callback>(),
    frameCallbackActive: new Set<number>(),
    isFrameCallbackRunning: false,
    previousFrameTimestamp: undefined,

    runCallbacks() {
      const loop = (lastFrameTimestamp: number) => {
        if (this.previousFrameTimestamp === undefined) {
          this.previousFrameTimestamp = lastFrameTimestamp;
        }

        const timeSinceLastFrame =
          lastFrameTimestamp - this.previousFrameTimestamp;

        this.frameCallbackActive.forEach((key: number) => {
          const callback = this.frameCallbackRegistry.get(key)!;

          const startTime = callback.startTime;
          const elapsedTime =
            lastFrameTimestamp - (startTime || lastFrameTimestamp);
          const lastFrameDuration =
            startTime === undefined ? undefined : timeSinceLastFrame;

          if (startTime === undefined) {
            callback.startTime = lastFrameTimestamp;
          }

          callback.function({
            lastFrameTimestamp,
            elapsedTime,
            lastFrameDuration,
          });
        });

        if (this.frameCallbackActive.size > 0) {
          this.previousFrameTimestamp = lastFrameTimestamp;
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
      callback: (callbackDetails: CallbackDetails) => void,
      callbackId: number
    ) {
      this.frameCallbackRegistry.set(callbackId, {
        function: callback,
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
