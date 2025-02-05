import { makeMutable } from 'react-native-reanimated';

import type { Operation } from '../types';
import { SyncUIRunner } from '../utils/SyncUIRunner';
import { assertMockedAnimationTimestamp } from './Asserts';
import { createUpdatesContainer } from './UpdatesContainer';

export class AnimationUpdatesRecorder {
  private _syncUIRunner: SyncUIRunner = new SyncUIRunner();

  public async recordAnimationUpdates() {
    const updatesContainer = createUpdatesContainer();
    const recordAnimationUpdates = updatesContainer.pushAnimationUpdates;
    const recordLayoutAnimationUpdates = updatesContainer.pushLayoutAnimationUpdates;

    await this._syncUIRunner.runOnUIBlocking(() => {
      'worklet';
      const originalUpdateProps = global._IS_FABRIC ? global._updatePropsFabric : global._updatePropsPaper;
      global.originalUpdateProps = originalUpdateProps;

      const mockedUpdateProps = (operations: Operation[]) => {
        recordAnimationUpdates(operations);
        originalUpdateProps(operations);
      };

      if (global._IS_FABRIC) {
        global._updatePropsFabric = mockedUpdateProps;
      } else {
        global._updatePropsPaper = mockedUpdateProps;
      }

      const originalNotifyAboutProgress = global._notifyAboutProgress;
      global.originalNotifyAboutProgress = originalNotifyAboutProgress;
      global._notifyAboutProgress = (tag: number, value: Record<string, unknown>, isSharedTransition: boolean) => {
        recordLayoutAnimationUpdates(tag, value);
        originalNotifyAboutProgress(tag, value, isSharedTransition);
      };
    });
    return updatesContainer;
  }

  public async stopRecordingAnimationUpdates() {
    await this._syncUIRunner.runOnUIBlocking(() => {
      'worklet';
      if (global.originalUpdateProps) {
        if (global._IS_FABRIC) {
          global._updatePropsFabric = global.originalUpdateProps;
        } else {
          global._updatePropsPaper = global.originalUpdateProps;
        }
        global.originalUpdateProps = undefined;
      }
      if (global.originalNotifyAboutProgress) {
        global._notifyAboutProgress = global.originalNotifyAboutProgress;
        global.originalNotifyAboutProgress = undefined;
      }
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
      global.__flushAnimationFrame = (_frameTimestamp: number) => {
        global.mockedAnimationTimestamp! += 16;
        global.__frameTimestamp = global.mockedAnimationTimestamp;
        global.originalFlushAnimationFrame!(global.mockedAnimationTimestamp!);
        global.framesCount!++;
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
        (global.requestAnimationFrame as any) = global.originalRequestAnimationFrame;
        global.originalRequestAnimationFrame = undefined;
      }
      if (global.originalFlushAnimationFrame) {
        global.__flushAnimationFrame = global.originalFlushAnimationFrame;
        global.originalFlushAnimationFrame = undefined;
      }
      if (global.mockedAnimationTimestamp) {
        global.mockedAnimationTimestamp = undefined;
      }
      if (global.framesCount) {
        global.framesCount = undefined;
      }
    });
  }

  public wait(delay: number) {
    return new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }

  public waitForAnimationUpdates(updatesCount: number): Promise<boolean> {
    const CHECK_INTERVAL = 20;
    const flag = makeMutable(false);
    return new Promise<boolean>(resolve => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      const interval = setInterval(async () => {
        await new SyncUIRunner().runOnUIBlocking(() => {
          'worklet';
          assertMockedAnimationTimestamp(global.framesCount);
          flag.value = global.framesCount >= updatesCount - 1;
        });
        if (flag.value) {
          clearInterval(interval);
          resolve(true);
        }
      }, CHECK_INTERVAL);
    });
  }
}
