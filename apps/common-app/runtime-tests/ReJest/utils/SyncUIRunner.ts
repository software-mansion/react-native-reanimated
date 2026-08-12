import { runOnUIAsync } from 'react-native-worklets';
import type { LockObject } from '../types';
import { DEFAULT_TIMEOUT_MS, withTimeout } from './waitFor';

class WaitForUnlock {
  private _lock: LockObject = {
    lock: false,
  };

  _setLock(value: boolean) {
    this._lock = { lock: value };
  }

  _waitForUnlock(maxWaitTime?: number) {
    const defaultPollingRate = 10;
    return new Promise((resolve) => {
      const startTime = performance.now();
      const interval = setInterval(() => {
        const currentTime = performance.now();
        const waitTimeExceeded =
          maxWaitTime && maxWaitTime < currentTime - startTime;
        if (this._lock.lock !== true || waitTimeExceeded) {
          clearInterval(interval);
          resolve(this._lock.lock);
        }
      }, defaultPollingRate);
    });
  }
}

export class SyncUIRunner {
  public async runOnUIBlocking<TReturn>(
    worklet: () => TReturn,
    maxWaitTime: number = DEFAULT_TIMEOUT_MS,
    description = 'a worklet to run on the UI runtime'
  ) {
    return withTimeout(runOnUIAsync(worklet), {
      description,
      timeout: maxWaitTime,
    });
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

  public async waitForUnlock(maxWaitTime?: number): Promise<boolean> {
    return (await this._waitForUnlock(maxWaitTime)) as boolean;
  }
}
