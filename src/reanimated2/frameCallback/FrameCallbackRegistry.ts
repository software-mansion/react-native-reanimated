export default class FrameCallbackRegistry {
  private nextCallbackId = 0;
  private frameCallbackRegistry = new Map<number, () => void>();
  private frameCallbackActive = new Set<number>();
  private isFrameCallbackRunning = false;

  private runAnimation() {
    const loop = () => {
      this.frameCallbackActive.forEach((key) => {
        const callback = this.frameCallbackRegistry.get(key);
        if (callback !== undefined) {
          callback();
        }
      });

      if (this.frameCallbackActive.size > 0) {
        window.requestAnimationFrame(loop);
      } else {
        this.isFrameCallbackRunning = false;
      }
    };

    if (!this.isFrameCallbackRunning) {
      window.requestAnimationFrame(loop);
      this.isFrameCallbackRunning = true;
    }
  }

  registerFrameCallback(callback: () => void): number {
    const callbackId = this.nextCallbackId;
    this.nextCallbackId++;

    this.frameCallbackRegistry.set(callbackId, callback);

    return callbackId;
  }

  unregisterFrameCallback(frameCallbackId: number): void {
    this.manageStateFrameCallback(frameCallbackId, false);
    this.frameCallbackRegistry.delete(frameCallbackId);
  }

  manageStateFrameCallback(frameCallbackId: number, state: boolean): void {
    if (state) {
      this.frameCallbackActive.add(frameCallbackId);
      this.runAnimation();
    } else {
      this.frameCallbackActive.delete(frameCallbackId);
    }
  }
}
