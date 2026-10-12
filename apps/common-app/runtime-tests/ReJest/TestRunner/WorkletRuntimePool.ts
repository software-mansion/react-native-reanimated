import type { WorkletRuntime } from 'react-native-worklets';
import { createWorkletRuntime } from 'react-native-worklets';

export class WorkletRuntimePool {
  private _runtimes: Map<string, WorkletRuntime> = new Map();

  private getOrCreateWorkletRuntime(name: string): WorkletRuntime {
    const existing = this._runtimes.get(name);
    if (existing) {
      return existing;
    }
    const runtime = createWorkletRuntime({ name });
    this._runtimes.set(name, runtime);
    return runtime;
  }

  public getOrCreateWorkletRuntimes(count: number): WorkletRuntime[] {
    const runtimes = Array.from(this._runtimes.values()).slice(0, count);
    while (runtimes.length < count) {
      runtimes.push(this.getOrCreateWorkletRuntime(`pooled${runtimes.length}`));
    }
    return runtimes;
  }
}
