'use strict';
import type { CallbackDetails, FrameInfo } from './commonTypes';

export default class FrameCallbackRegistryJS {
  private nextCallbackId = 0;
  private nextCallId = 0;
  private previousFrameTimestamp: number | null = null;
  private frameCallbackRegistry = new Map<number, CallbackDetails>();
  private activeFrameCallbacks = new Set<number>();

  registerFrameCallback(callback: (frameInfo: FrameInfo) => void): number {
    if (!callback) {
      return -1;
    }

    const callbackId = this.nextCallbackId;
    this.nextCallbackId++;

    this.frameCallbackRegistry.set(callbackId, { callback, startTime: null });

    return callbackId;
  }

  unregisterFrameCallback(callbackId: number): void {
    this.manageStateFrameCallback(callbackId, false);
    this.frameCallbackRegistry.delete(callbackId);
  }

  manageStateFrameCallback(callbackId: number, state: boolean): void {
    if (callbackId === -1) {
      return;
    }
    if (state) {
      if (!this.activeFrameCallbacks.has(callbackId)) {
        this.activeFrameCallbacks.add(callbackId);
        this.runCallbacks(this.nextCallId);
      }
    } else {
      const callback = this.frameCallbackRegistry.get(callbackId)!;
      callback.startTime = null;

      this.activeFrameCallbacks.delete(callbackId);
      if (this.activeFrameCallbacks.size === 0) {
        this.nextCallId += 1;
      }
    }
  }

  private runCallbacks(callId: number): void {
    const loop = (timestamp: number) => {
      if (callId !== this.nextCallId) {
        return;
      }
      if (this.previousFrameTimestamp === null) {
        this.previousFrameTimestamp = timestamp;
      }

      const delta = timestamp - this.previousFrameTimestamp;

      this.activeFrameCallbacks.forEach((callbackId: number) => {
        const callbackDetails = this.frameCallbackRegistry.get(callbackId)!;
        const { startTime } = callbackDetails;

        if (startTime === null) {
          callbackDetails.startTime = timestamp;
          callbackDetails.callback({
            timestamp,
            timeSincePreviousFrame: null,
            timeSinceFirstFrame: 0,
          });
        } else {
          callbackDetails.callback({
            timestamp,
            timeSincePreviousFrame: delta,
            timeSinceFirstFrame: timestamp - startTime,
          });
        }
      });

      if (this.activeFrameCallbacks.size > 0) {
        this.previousFrameTimestamp = timestamp;
        requestAnimationFrame(loop);
      } else {
        this.previousFrameTimestamp = null;
      }
    };

    if (this.activeFrameCallbacks.size === 1 && callId === this.nextCallId) {
      requestAnimationFrame(loop);
    }
  }
}
