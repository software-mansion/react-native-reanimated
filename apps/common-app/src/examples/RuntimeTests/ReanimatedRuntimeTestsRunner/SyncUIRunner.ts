import { runOnJS, runOnUI } from 'react-native-reanimated';
import type { LockObject } from './types';

export class SyncUIRunner {
  private _threadLock: LockObject = {
    lock: false,
  };

  private waitForThreadUnlock(maxWaitTime?: number) {
    return new Promise(resolve => {
      const startTime = performance.now();
      const interval = setInterval(() => {
        const currentTime = performance.now();
        const waitTimeExceeded = maxWaitTime && maxWaitTime < currentTime - startTime;
        if (this._threadLock.lock !== true || waitTimeExceeded) {
          clearInterval(interval);
          resolve(this._threadLock.lock);
        }
      }, 10);
    });
  }

  public async runOnUIBlocking(worklet: () => void, maxWaitTime?: number) {
    const unlock = () => (this._threadLock.lock = false);
    this._threadLock.lock = true;
    runOnUI(() => {
      'worklet';
      worklet();
      runOnJS(unlock)();
    })();
    await this.waitForThreadUnlock(maxWaitTime);
  }
}
