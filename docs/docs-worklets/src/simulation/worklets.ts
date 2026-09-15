import { SnippetError } from './errors';
import type { InterceptedApi, WorkletRuntimeHandle } from './types';

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

export function getCurrentThreadId(): string {
  return dispatch('getCurrentThreadId', []) as string;
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
