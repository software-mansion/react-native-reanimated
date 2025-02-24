import { createWorkletRuntime, runOnRuntime } from './runtimes';
import type { WorkletRuntime } from './runtimes';
import { runOnJS } from './threads';

export class Worker {
  onmessage: (e: MessageEvent<unknown>) => void = () => {};

  private runtime: WorkletRuntime;

  constructor(script: () => void) {
    this.runtime = createWorkletRuntime('Worker runtime');

    // This is just a remote function that wraps `this.onmessage` since we can't pass `this` to the worklet.
    const callOnmessage = (e: MessageEvent<unknown>) => {
      this.onmessage?.(e);
    };

    runOnRuntime(this.runtime, () => {
      'worklet';

      // @ts-ignore TODO
      postMessage = (data: unknown) => {
        // @ts-ignore TODO
        runOnJS(callOnmessage)({ data });
      };

      script();
    })();
  }

  postMessage(data: unknown) {
    runOnRuntime(this.runtime, (d: unknown) => {
      'worklet';
      // @ts-ignore TODO
      global.onmessage?.({ data: d });
    })(data);
  }

  toString() {
    return '[object Worker]';
  }
}

// @ts-ignore TODO
window.Worker = Worker;
