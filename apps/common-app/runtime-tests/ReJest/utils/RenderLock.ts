import { DEFAULT_TIMEOUT_MS, withTimeout } from './waitFor';

export class RenderLock {
  private _wasRenderedNull: boolean = true;
  private _resolveRender: (() => void) | null = null;
  private _renderPromise: Promise<void> | null = null;

  public lock() {
    if (this._resolveRender) {
      return;
    }
    this._renderPromise = new Promise<void>((resolve) => {
      this._resolveRender = resolve;
    });
  }

  public unlock() {
    this._resolveRender?.();
    this._resolveRender = null;
    this._renderPromise = null;
  }

  public wasRenderedNull() {
    return this._wasRenderedNull;
  }

  public setRenderedNull(wasRenderedNull: boolean) {
    this._wasRenderedNull = wasRenderedNull;
  }

  public async waitForRender(maxWaitTime: number = DEFAULT_TIMEOUT_MS) {
    if (!this._renderPromise) {
      return;
    }
    await withTimeout(this._renderPromise, {
      description: 'the component to render',
      timeout: maxWaitTime,
    });
  }
}
