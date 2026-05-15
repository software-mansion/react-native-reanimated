import type { WorkletRuntime } from 'react-native-worklets';
import { createWorkletRuntime } from 'react-native-worklets';

export class WorkletRuntimePool {
  private _runtimes: Map<string, WorkletRuntime> = new Map();

  public getOrCreateWorkletRuntime(name: string): WorkletRuntime {
    const existing = this._runtimes.get(name);
    if (existing) {
      return existing;
    }
    const runtime = createWorkletRuntime({ name });
    this._runtimes.set(name, runtime);
    return runtime;
  }
}
