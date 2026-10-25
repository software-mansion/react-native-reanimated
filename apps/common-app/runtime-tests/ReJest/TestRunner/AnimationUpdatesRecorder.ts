import type { Operation, RecordingOptions } from '../types';
import { runOnUIBlocking } from '../utils/runOnUIBlocking';
import { sleep, waitFor } from '../utils/waitFor';
import { assertMockedAnimationTimestamp } from './Asserts';
import { createUpdatesContainer } from './UpdatesContainer';

const MAX_WAIT_TIME_MS = 10000;

export class AnimationUpdatesRecorder {
  private activeRecording?: ReturnType<typeof createUpdatesContainer>;
  private recordings: Array<ReturnType<typeof createUpdatesContainer>> = [];
  public async recordAnimationUpdates(options: RecordingOptions = {}) {
    const updatesContainer = createUpdatesContainer(options);
    const registerViews = updatesContainer.registerViews;
    const saveError = updatesContainer.saveError;
    const recordAnimationUpdates = updatesContainer.pushAnimationUpdates;
    const recordLayoutAnimationUpdates =
      updatesContainer.pushLayoutAnimationUpdates;

    await runOnUIBlocking(() => {
      'worklet';
      if (global.originalUpdateProps) {
        throw new Error('Animation updates are already being recorded');
      }
      const manager = global.UpdatePropsManager;
      // oxlint-disable-next-line typescript/unbound-method
      const originalUpdate = manager.update;
      global.originalUpdatePropsManagerUpdate = originalUpdate;
      manager.update = function (descriptors, updates) {
        try {
          registerViews(descriptors.value);
        } catch (error) {
          saveError(error);
        }
        originalUpdate.call(manager, descriptors, updates);
      };
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
        try {
          recordAnimationUpdates(operations);
        } catch (error) {
          saveError(error);
        }
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
        try {
          recordLayoutAnimationUpdates(tag, value);
        } catch (error) {
          saveError(error);
        }
        originalNotifyAboutProgress(tag, value);
      };
    });
    this.activeRecording = updatesContainer;
    this.recordings.push(updatesContainer);
    return {
      getUpdates: updatesContainer.getUpdates,
      getAllUpdates: updatesContainer.getAllUpdates,
      getNativeSnapshots: updatesContainer.getNativeSnapshots,
      getSnapshots: updatesContainer.getSnapshots,
    };
  }

  public async stopRecordingAnimationUpdates(maxWaitTime = MAX_WAIT_TIME_MS) {
    try {
      await this.activeRecording?.finalize();
    } finally {
      await runOnUIBlocking(() => {
        'worklet';
        if (global.originalUpdateProps) {
          global._updateProps = global.originalUpdateProps;
          global.originalUpdateProps = undefined;
        }
        if (global.originalNotifyAboutProgress) {
          global._notifyAboutProgress = global.originalNotifyAboutProgress;
          global.originalNotifyAboutProgress = undefined;
        }
        if (global.originalUpdatePropsManagerUpdate) {
          global.UpdatePropsManager.update =
            global.originalUpdatePropsManagerUpdate;
          global.originalUpdatePropsManagerUpdate = undefined;
        }
        global.animationUpdatesRecordingStarted = undefined;
      }, maxWaitTime);
      this.activeRecording = undefined;
    }
  }

  public async takeUnreportedErrors() {
    const recordings = this.recordings;
    this.recordings = [];
    const errors: Error[] = [];
    for (const recording of recordings) {
      const recorded = await recording.getUnreportedError();
      if (recorded) {
        const error = new Error(recorded.message);
        error.stack = recorded.stack ?? error.stack;
        errors.push(error);
      }
    }
    return errors;
  }

  public async mockAnimationTimer() {
    await runOnUIBlocking(() => {
      'worklet';
      global.mockedAnimationTimestamp = 0;
      global.framesCount = 0;

      if (global.originalGetAnimationTimestamp !== undefined) {
        return;
      }

      global.originalGetAnimationTimestamp = global._getAnimationTimestamp;

      Object.defineProperty(global, '__frameTimestamp', {
        configurable: true,
        get: () => global.mockedAnimationTimestamp,
        set: () => {},
      });
      global._getAnimationTimestamp = () => {
        if (global.mockedAnimationTimestamp === undefined) {
          throw new Error("Animation timestamp wasn't initialized");
        }
        return global.mockedAnimationTimestamp;
      };

      const originalRequestAnimationFrame = global.requestAnimationFrame;
      global.originalRequestAnimationFrame = originalRequestAnimationFrame;
      global.requestAnimationFrame = (callback: FrameRequestCallback) => {
        originalRequestAnimationFrame(() => {
          callback(global._getAnimationTimestamp());
        });
        return 0;
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

  public async unmockAnimationTimer(maxWaitTime = MAX_WAIT_TIME_MS) {
    await runOnUIBlocking(() => {
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
      if (global.originalNativeRequestAnimationFrame) {
        global.__nativeRequestAnimationFrame =
          global.originalNativeRequestAnimationFrame;
        global.originalNativeRequestAnimationFrame = undefined;
      }
      global.mockedAnimationTimestamp = undefined;
      global.framesCount = undefined;
      Object.defineProperty(global, '__frameTimestamp', {
        configurable: true,
        writable: true,
        value: undefined,
      });
    }, maxWaitTime);
  }

  public wait(delay: number) {
    return sleep(delay);
  }

  public async waitForAnimationUpdates(
    updatesCount: number,
    maxWaitTime = MAX_WAIT_TIME_MS
  ) {
    const CHECK_INTERVAL = 20;
    let framesSeen = 0;
    let isFirstPoll = true;

    const readFramesCount = async () => {
      const shouldAssertMock = isFirstPoll;
      isFirstPoll = false;

      return runOnUIBlocking(
        () => {
          'worklet';
          if (shouldAssertMock) {
            assertMockedAnimationTimestamp(global.framesCount);
          }
          if (global.animationUpdatesRecordingStarted !== true) {
            return undefined;
          }
          return global.framesCount;
        },
        maxWaitTime,
        'the UI runtime to report the recorded frame count'
      );
    };

    await waitFor(
      async () => {
        const framesCount = await readFramesCount();
        if (framesCount === undefined) {
          return false;
        }
        framesSeen = framesCount;
        return framesCount >= updatesCount - 1;
      },
      {
        description: `${updatesCount} animation updates`,
        timeout: maxWaitTime,
        interval: CHECK_INTERVAL,
        describeState: () => `${framesSeen} updates`,
      }
    );
  }
}
