import { runOnJS, runOnUI } from 'react-native-reanimated';

import type { LockObject } from '../types';

class WaitForUnlock {
  private _lock: LockObject = {
    lock: false,
  };

  _setLock(value: boolean) {
    this._lock = { lock: value };
  }

  _waitForUnlock(maxWaitTime?: number) {
    return new Promise(resolve => {
      const startTime = performance.now();
      const interval = setInterval(() => {
        const currentTime = performance.now();
        const waitTimeExceeded = maxWaitTime && maxWaitTime < currentTime - startTime;
        if (this._lock.lock !== true || waitTimeExceeded) {
          clearInterval(interval);
          resolve(this._lock.lock);
        }
      }, 10);
    });
  }
}

export class SyncUIRunner extends WaitForUnlock {
  public async runOnUIBlocking(worklet: () => void, maxWaitTime?: number) {
    const unlock = () => this._setLock(false);
    this._setLock(true);
    runOnUI(() => {
      'worklet';
      worklet();
      runOnJS(unlock)();
    })();
    await this._waitForUnlock(maxWaitTime);
  }
}

export class RenderLock extends WaitForUnlock {
  private _wasRenderedNull: boolean = true;

  public lock() {
    this._setLock(true);
  }

  public unlock() {
    this._setLock(false);
  }

  public wasRenderedNull() {
    return this._wasRenderedNull;
  }

  public setRenderedNull(wasRenderedNull: boolean) {
    this._wasRenderedNull = wasRenderedNull;
  }

  public async waitForUnlock(maxWaitTime?: number) {
    await this._waitForUnlock(maxWaitTime);
  }
}
