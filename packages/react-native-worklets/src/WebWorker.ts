import { createWorkletRuntime, runOnRuntime } from './runtimes';
import { runOnJS } from './threads';
import type { WorkletRuntime } from './workletTypes';
import { WorkletsModule } from './WorkletsModule';
import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';
import type { EventSubscription } from 'react-native/Libraries/vendor/emitter/EventEmitter';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WorkletMessageHandler<T = any> = (event: { data: T }) => void;

interface WorkletGlobalScope<Tin, Tout> {
  postMessage: (data: Tout) => void;
  onmessage: WorkletMessageHandler<Tin>;
  onerror: WorkletMessageHandler<string>;
}

declare const global: WorkletGlobalScope<any, any>;

export class WebWorker<Tin = unknown, Tout = unknown> extends EventEmitter {
  private runtime: WorkletRuntime;
  private _onmessage: (e: { data: Tout }) => void = () => {};
  private _onerror: (e: { data: string }) => void = () => {};
  private _onmessageSubscription: EventSubscription | null = null;
  private _onerrorSubscription: EventSubscription | null = null;

  public get onmessage(): (e: { data: Tout }) => void {
    return this._onmessage;
  }

  public set onmessage(listener: (e: { data: Tout }) => void) {
    this._onmessageSubscription?.remove(); // Remove previous listener if exists
    this._onmessage = listener;
    // Add new listener and store its subscription
    this._onmessageSubscription = this.addListener('message', listener);
  }

  public get onerror(): (e: { data: string }) => void {
    return this._onerror;
  }

  public set onerror(listener: (e: { data: string }) => void) {
    this._onerrorSubscription?.remove(); // Remove previous listener if exists
    this._onerror = listener;
    // Add new listener and store its subscription
    this._onerrorSubscription = this.addListener('error', listener);
  }

  public terminate = () => {
    this._onmessageSubscription?.remove();
    this._onerrorSubscription?.remove();
    WorkletsModule.terminateWorkletRuntime(this.runtime);
  };

  constructor(name: string, script: () => void) {
    super();
    this.runtime = createWorkletRuntime(name);

    const callOnmessage = (e: { data: Tout }) => {
      this.emit('message', e);
    };

    runOnRuntime(this.runtime, () => {
      'worklet';
      // Define postMessage in the worklet scope can be called inside the script function to send message from the worker to the main thread
      (global as WorkletGlobalScope<Tin, Tout>).postMessage = (data: Tout) => {
        runOnJS(callOnmessage)({ data });
      };

      // Execute the user-provided script in the worklet context - should define the onmessage handler
      script();
    })();
  }

  postMessage(data: Tin) {
    // Define emitError wrapper here for use in the catch block
    const emitError = (e: { data: string }) => this.emit('error', e);

    runOnRuntime(this.runtime, (d: Tin) => {
      'worklet';
      // Call the onmessage handler defined within the worklet's script
      try {
        (global as WorkletGlobalScope<Tin, Tout>).onmessage?.({ data: d });
      } catch (e: unknown) {
        // Use emitError wrapper
        if (e instanceof Error) {
          runOnJS(emitError)({ data: e.message });
        } else {
          runOnJS(emitError)({ data: 'Unknown error' });
        }
      }
    })(data);
  }

  toString() {
    return '[object Worker]';
  }
}

// Assign the custom WebWorker to the global scope.
// @ts-ignore
global.Worker = WebWorker;
