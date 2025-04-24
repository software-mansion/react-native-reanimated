import { createWorkletRuntime, runOnRuntime } from './runtimes';
import { runOnJS, runOnUI } from './threads';
import { WorkletRuntime } from './workletTypes';
import { WorkletsModule } from './WorkletsModule';

export class Worker {
  onmessage: (e: MessageEvent<unknown>) => void = () => {};
  private runtime: WorkletRuntime;

  public terminate = () => {
    WorkletsModule.terminateWorkletRuntime(this.runtime);
  };

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