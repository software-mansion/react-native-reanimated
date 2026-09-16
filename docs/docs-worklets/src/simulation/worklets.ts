import { SnippetError } from './errors';
import type {
  AwaitMarker,
  InterceptedApi,
  PromiseHandle,
  WorkletRuntimeHandle,
} from './types';

export interface Interceptor {
  intercept(api: InterceptedApi, args: unknown[]): unknown;
}

type SnippetCallback<Args extends unknown[]> = (
  ...args: Args
) => Generator<unknown, unknown, unknown>;

let currentInterceptor: Interceptor | null = null;

export const NEXT_TICK = Symbol('nextTick');

export function nextTick(): symbol {
  return NEXT_TICK;
}

export function scheduleOnUI<Args extends unknown[]>(
  fn: SnippetCallback<Args>,
  ...args: Args
): void {
  dispatch('scheduleOnUI', [fn, ...args]);
}

export function scheduleOnRN<Args extends unknown[]>(
  fn: SnippetCallback<Args>,
  ...args: Args
): void {
  dispatch('scheduleOnRN', [fn, ...args]);
}

export function createWorkletRuntime(config?: {
  name?: string;
}): WorkletRuntimeHandle {
  return dispatch('createWorkletRuntime', [config]) as WorkletRuntimeHandle;
}

export function scheduleOnRuntime<Args extends unknown[]>(
  runtime: WorkletRuntimeHandle,
  fn: SnippetCallback<Args>,
  ...args: Args
): void {
  dispatch('scheduleOnRuntime', [runtime, fn, ...args]);
}

export function sendToUIThread<Args extends unknown[]>(
  fn: SnippetCallback<Args>,
  ...args: Args
): void {
  dispatch('sendToUIThread', [fn, ...args]);
}

export function updateScreen(patch: Record<string, unknown>): void {
  dispatch('updateScreen', [patch]);
}

export function setNativeProps(
  nativeID: string,
  props: Record<string, unknown>
): void {
  dispatch('updateScreen', [{ nativeProps: { [nativeID]: props } }]);
}

export function runOnUISync<Args extends unknown[]>(
  fn: SnippetCallback<Args>,
  ...args: Args
): unknown {
  return dispatch('runOnUISync', [fn, ...args]);
}

export function runOnRuntimeSync<Args extends unknown[]>(
  runtime: WorkletRuntimeHandle,
  fn: SnippetCallback<Args>,
  ...args: Args
): unknown {
  return dispatch('runOnRuntimeSync', [runtime, fn, ...args]);
}

export function runOnUIAsync<Args extends unknown[]>(
  fn: SnippetCallback<Args>,
  ...args: Args
): PromiseHandle {
  return dispatch('runOnUIAsync', [fn, ...args]) as PromiseHandle;
}

export function runOnRuntimeAsync<Args extends unknown[]>(
  runtime: WorkletRuntimeHandle,
  fn: SnippetCallback<Args>,
  ...args: Args
): PromiseHandle {
  return dispatch('runOnRuntimeAsync', [runtime, fn, ...args]) as PromiseHandle;
}

export function awaitPromise(promise: PromiseHandle): AwaitMarker {
  return { __await: true, promise };
}

export function isAwaitMarker(value: unknown): value is AwaitMarker {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as AwaitMarker).__await === true
  );
}

export function getCurrentThreadId(): string {
  return dispatch('getCurrentThreadId', []) as string;
}

export function setTimeout(callback: () => unknown, ms = 0): number {
  return dispatch('setTimeout', [callback, ms]) as number;
}

export function setInterval(callback: () => unknown, ms = 0): number {
  return dispatch('setInterval', [callback, ms]) as number;
}

export function clearInterval(id: number): void {
  dispatch('clearInterval', [id]);
}

const runtimeGlobal: Record<string, unknown> = new Proxy(
  {},
  {
    get(_target, key) {
      return dispatch('globalGet', [key]);
    },
    set(_target, key, value) {
      dispatch('globalSet', [key, value]);
      return true;
    },
  }
);

export { runtimeGlobal as globalThis };

export interface Synchronizable<T> {
  __synchronizable: true;
  id: number;
  getDirty: () => T;
  getBlocking: () => T;
  setDirty: (value: T) => void;
  setBlocking: (value: T | ((previous: T) => T)) => void;
}

export function createSynchronizable<T>(
  initial: T,
  options?: { fixedType?: boolean }
): Synchronizable<T> {
  const id = dispatch('createSynchronizable', [initial, options]) as number;
  return {
    __synchronizable: true,
    id,
    getDirty: () => dispatch('synchronizableRead', [id, 'dirty']) as T,
    getBlocking: () => dispatch('synchronizableRead', [id, 'blocking']) as T,
    setDirty: (value) => {
      dispatch('synchronizableWrite', [id, value, 'dirty']);
    },
    setBlocking: (value) => {
      dispatch('synchronizableWrite', [id, value, 'blocking']);
    },
  };
}

export interface Shareable<T> {
  __shareable: true;
  id: number;
  value: T;
  getSync: () => T;
  getAsync: () => PromiseHandle;
}

export function createShareable<T>(
  runtimeId: number,
  initial: T
): Shareable<T> {
  const id = dispatch('createShareable', [runtimeId, initial]) as number;
  const handle = {
    __shareable: true as const,
    id,
    getSync: () => dispatch('shareableGetSync', [id]) as T,
    getAsync: () => dispatch('shareableGetAsync', [id]) as PromiseHandle,
  };
  return new Proxy(handle as unknown as Shareable<T>, {
    get(target, key) {
      if (key === 'value') {
        return dispatch('shareableRead', [id]);
      }
      return target[key as keyof Shareable<T>];
    },
    set(target, key, value) {
      if (key === 'value') {
        dispatch('shareableWrite', [id, value]);
        return true;
      }
      (target as unknown as Record<string | symbol, unknown>)[key] = value;
      return true;
    },
  });
}

export function readShareableValue(id: number): unknown {
  return dispatch('shareableRead', [id]);
}

export function setCurrentInterceptor(interceptor: Interceptor | null): void {
  currentInterceptor = interceptor;
}

function dispatch(api: InterceptedApi, args: unknown[]): unknown {
  if (currentInterceptor === null) {
    throw new SnippetError(
      `${api} was called outside of a simulation step; snippet functions run only through the Machine`
    );
  }
  return currentInterceptor.intercept(api, args);
}
