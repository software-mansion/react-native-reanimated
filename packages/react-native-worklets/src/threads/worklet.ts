'use strict';

import { logger } from '../logger';
import { shareableMappingCache } from '../shareableMappingCache';
import { makeShareableCloneRecursive } from '../shareables';
import { runOnUI } from '../threads';
import type { WorkletFunction } from '../workletTypes';

export function worklet<TArgs extends unknown[], TReturn>(
  workletFunction: WorkletFunction<TArgs, TReturn>
) {
  const dispatcher = new WorkletDispatcherRN(workletFunction);
  const workletRuntimeDispatcher = {
    __init: () => {
      'worklet';
      return {
        scheduleOnUI: placeholder,
        runOnUIAsync: placeholder,
        runOnUISync: placeholder,

        scheduleOnRN: placeholder,
        runOnRNAsync: placeholder,
        runOnRNSync: placeholder,

        scheduleOnRuntime: placeholder,
        runOnRuntimeAsync: placeholder,
        runOnRuntimeSync: placeholder,
      };
    },
  };
  const workletRuntimeDispatcherHandle = makeShareableCloneRecursive(
    workletRuntimeDispatcher
  );
  shareableMappingCache.set(dispatcher, workletRuntimeDispatcherHandle);
  return dispatcher;
}

export interface Worklet {
  <TArgs extends unknown[], TReturn>(
    workletFunction: (...args: TArgs) => TReturn
  ): WorkletDispatcherStub<TArgs, TReturn>;
}

class WorkletDispatcherStub<TArgs extends unknown[], TReturn> {
  protected worklet: WorkletFunction<TArgs, TReturn>;

  constructor(workletFunction: WorkletFunction<TArgs, TReturn>) {
    this.worklet = workletFunction;
  }

  scheduleOnUI(..._args: TArgs): void {
    placeholder();
  }
  runOnUIAsync(..._args: TArgs): Promise<TReturn> {
    const resolve = placeholder;
    const promise = new Promise(resolve);
    resolve();
    return promise as Promise<TReturn>;
  }
  runOnUISync(..._args: TArgs): TReturn {
    return placeholder();
  }

  scheduleOnRN(..._args: TArgs): void {
    placeholder();
  }
  runOnRNAsync(..._args: TArgs): Promise<TReturn> {
    const resolve = placeholder;
    const promise = new Promise(resolve);
    resolve();
    return promise as Promise<TReturn>;
  }
  runOnRNSync(..._args: TArgs): TReturn {
    return placeholder();
  }

  scheduleOnRuntime(_runtime: unknown, ..._args: TArgs): void {
    placeholder();
  }
  runOnRuntimeAsync(_runtime: unknown, ..._args: TArgs): Promise<TReturn> {
    const resolve = placeholder;
    const promise = new Promise(resolve);
    resolve();
    return promise as Promise<TReturn>;
  }
  runOnRuntimeSync(_runtime: unknown, ..._args: TArgs): TReturn {
    return placeholder();
  }
}

class WorkletDispatcherRN<
  TArgs extends unknown[],
  TReturn,
> extends WorkletDispatcherStub<TArgs, TReturn> {
  constructor(workletFunction: WorkletFunction<TArgs, TReturn>) {
    super(workletFunction);
    makeShareableCloneRecursive(workletFunction);
  }

  scheduleOnUI(...args: TArgs): void {
    runOnUI(this.worklet)(...args);
  }
}

function placeholder() {
  'worklet';
  logger.warn('Not implemented.');
  return null!;
}
