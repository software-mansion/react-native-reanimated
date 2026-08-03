import { makeMutable } from 'react-native-reanimated';

import type { Operation } from '../types';
import { SyncUIRunner } from '../utils/SyncUIRunner';
import { assertMockedAnimationTimestamp } from './Asserts';
import { createUpdatesContainer } from './UpdatesContainer';

const MAX_WAIT_TIME_MS = 10000;

export class AnimationUpdatesRecorder {
  private _syncUIRunner: SyncUIRunner = new SyncUIRunner();

  public async recordAnimationUpdates() {
    const updatesContainer = createUpdatesContainer();
    const recordAnimationUpdates = updatesContainer.pushAnimationUpdates;
    const recordLayoutAnimationUpdates =
      updatesContainer.pushLayoutAnimationUpdates;

    await this._syncUIRunner.runOnUIBlocking(() => {
      'worklet';
      global.animationUpdatesRecordingStarted = false;

      const startCountingFrames = () => {
        'worklet';
        if (!global.animationUpdatesRecordingStarted) {
          global.animationUpdatesRecordingStarted = true;
          global.framesCount = 0;
        }
      };

      const originalUpdateProps = global._updateProps;
      global.originalUpdateProps = originalUpdateProps;

      const mockedUpdateProps = (operations: Operation[]) => {
        startCountingFrames();
        recordAnimationUpdates(operations);
        originalUpdateProps(operations);
      };

      global._updateProps = mockedUpdateProps;

      const originalNotifyAboutProgress = global._notifyAboutProgress;
      global.originalNotifyAboutProgress = originalNotifyAboutProgress;
      global._notifyAboutProgress = (
        tag: number,
        value: Record<string, unknown>
      ) => {
        startCountingFrames();
        recordLayoutAnimationUpdates(tag, value);
        originalNotifyAboutProgress(tag, value);
      };
    });
    return updatesContainer;
  }

  public async stopRecordingAnimationUpdates() {
    await this._syncUIRunner.runOnUIBlocking(() => {
      'worklet';
      if (global.originalUpdateProps) {
        global._updateProps = global.originalUpdateProps;
        global.originalUpdateProps = undefined;
      }
      if (global.originalNotifyAboutProgress) {
        global._notifyAboutProgress = global.originalNotifyAboutProgress;
        global.originalNotifyAboutProgress = undefined;
      }
      global.animationUpdatesRecordingStarted = undefined;
    });
  }

  public async mockAnimationTimer() {
    await this._syncUIRunner.runOnUIBlocking(() => {
      'worklet';
      global.mockedAnimationTimestamp = 0;
      global.originalGetAnimationTimestamp = global._getAnimationTimestamp;
      global._getAnimationTimestamp = () => {
        if (global.mockedAnimationTimestamp === undefined) {
          throw new Error("Animation timestamp wasn't initialized");
        }
        return global.mockedAnimationTimestamp;
      };
      global.framesCount = 0;

      const originalRequestAnimationFrame = global.requestAnimationFrame;
      global.originalRequestAnimationFrame = originalRequestAnimationFrame;
      global.requestAnimationFrame = (callback: FrameRequestCallback) => {
        originalRequestAnimationFrame(() => {
          callback(global._getAnimationTimestamp());
        });
        return 0;
      };

      global.originalFlushAnimationFrame = global.__flushAnimationFrame;
      global.__flushAnimationFrame = (frameTimestamp: number) => {
        if (global.mockedAnimationTimestamp === undefined) {
          global.originalFlushAnimationFrame!(frameTimestamp);
          return;
        }
        global.mockedAnimationTimestamp += 16;
        global.__frameTimestamp = global.mockedAnimationTimestamp;
        global.originalFlushAnimationFrame!(global.mockedAnimationTimestamp);
        global.framesCount = (global.framesCount ?? 0) + 1;
      };

      global.originalNativeRequestAnimationFrame =
        global.__nativeRequestAnimationFrame;
      global.__nativeRequestAnimationFrame = (
        callback: (timestamp: number) => void
      ) => {
        global.originalNativeRequestAnimationFrame!((timestamp: number) => {
          if (global.mockedAnimationTimestamp === undefined) {
            callback(timestamp);
            return;
          }
          global.mockedAnimationTimestamp += 16;
          global.framesCount = (global.framesCount ?? 0) + 1;
          callback(global.mockedAnimationTimestamp);
        });
      };
    });
  }

  public async unmockAnimationTimer() {
    await this._syncUIRunner.runOnUIBlocking(() => {
      'worklet';
      if (global.originalGetAnimationTimestamp) {
        global._getAnimationTimestamp = global.originalGetAnimationTimestamp;
        global.originalGetAnimationTimestamp = undefined;
      }
      if (global.originalRequestAnimationFrame) {
        (global.requestAnimationFrame as any) =
          global.originalRequestAnimationFrame;
        global.originalRequestAnimationFrame = undefined;
      }
      if (global.originalFlushAnimationFrame) {
        global.__flushAnimationFrame = global.originalFlushAnimationFrame;
        global.originalFlushAnimationFrame = undefined;
      }
      if (global.originalNativeRequestAnimationFrame) {
        global.__nativeRequestAnimationFrame =
          global.originalNativeRequestAnimationFrame;
        global.originalNativeRequestAnimationFrame = undefined;
      }
      global.mockedAnimationTimestamp = undefined;
      global.framesCount = undefined;
    });
  }

  public wait(delay: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, delay);
    });
  }

  public waitForAnimationUpdates(
    updatesCount: number,
    maxWaitTime = MAX_WAIT_TIME_MS
  ): Promise<boolean> {
    const CHECK_INTERVAL = 20;
    const flag = makeMutable(false);
    const framesSeen = makeMutable(0);
    return new Promise<boolean>((resolve, reject) => {
      const startTime = performance.now();
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      const interval = setInterval(async () => {
        await new SyncUIRunner().runOnUIBlocking(() => {
          'worklet';
          assertMockedAnimationTimestamp(global.framesCount);
          framesSeen.value = global.framesCount!;
          flag.value = global.framesCount >= updatesCount - 1;
        });
        if (flag.value) {
          clearInterval(interval);
          resolve(true);
          return;
        }
        if (performance.now() - startTime > maxWaitTime) {
          clearInterval(interval);
          reject(
            new Error(
              `Timed out after ${maxWaitTime}ms while waiting for ${updatesCount} animation updates, got ${framesSeen.value}.`
            )
          );
        }
      }, CHECK_INTERVAL);
    });
  }
}
