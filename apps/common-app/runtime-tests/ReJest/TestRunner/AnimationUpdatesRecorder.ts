import type { Operation } from '../types';
import { runOnUIBlocking } from '../utils/runOnUIBlocking';
import { sleep, waitFor } from '../utils/waitFor';
import { assertMockedAnimationTimestamp } from './Asserts';
import { createUpdatesContainer } from './UpdatesContainer';

const MAX_WAIT_TIME_MS = 10000;

export class AnimationUpdatesRecorder {
  public async recordAnimationUpdates() {
    const updatesContainer = createUpdatesContainer();
    const recordAnimationUpdates = updatesContainer.pushAnimationUpdates;
    const recordLayoutAnimationUpdates =
      updatesContainer.pushLayoutAnimationUpdates;

    await runOnUIBlocking(() => {
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

  public async stopRecordingAnimationUpdates(maxWaitTime = MAX_WAIT_TIME_MS) {
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
      global.animationUpdatesRecordingStarted = undefined;
    }, maxWaitTime);
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
