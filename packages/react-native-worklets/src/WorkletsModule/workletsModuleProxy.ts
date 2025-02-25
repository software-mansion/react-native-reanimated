'use strict';

import type { ShareableRef, WorkletRuntime } from '../workletTypes';

/** Type of `__workletsModuleProxy` injected with JSI. */
export interface WorkletsModuleProxy {
  makeShareableClone<TValue>(
    value: TValue,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ): ShareableRef<TValue>;

  scheduleOnUI<TValue>(shareable: ShareableRef<TValue>): void;

  executeOnUIRuntimeSync<TValue, TReturn>(
    shareable: ShareableRef<TValue>
  ): TReturn;

  createWorkletRuntime(
    name: string,
    initializer: ShareableRef<() => void>
  ): WorkletRuntime;

  scheduleOnRuntime<TValue>(
    workletRuntime: WorkletRuntime,
    worklet: ShareableRef<TValue>
  ): void;
}

export interface IWorkletsModule extends WorkletsModuleProxy {}
