'use strict';
import type { WorkletFunction } from 'react-native-worklets';
import { isWorkletFunction } from 'react-native-worklets';

import type { UnknownRecord } from '../common';
import type { ReanimatedEvent } from './commonTypes';

export interface GeneralHandler<
  TEvent extends object,
  TContext extends UnknownRecord,
> {
  (event: ReanimatedEvent<TEvent>, context: TContext): void;
}

export type GeneralHandlers<
  TEvent extends object,
  TContext extends UnknownRecord,
> = Record<string, GeneralHandler<TEvent, TContext> | undefined>;

export interface UseHandlerContext<TContext extends UnknownRecord> {
  context: TContext;
  doDependenciesDiffer: boolean;
}

export function ensureWorkletHandlers(handlers: UnknownRecord) {
  const nonWorkletNames = Object.entries(handlers).reduce<string[]>(
    (acc, [name, handler]) => {
      if (!isWorkletFunction(handler)) acc.push(name);
      return acc;
    },
    []
  );

  if (nonWorkletNames.length > 0) {
    throw new Error(
      `[Reanimated] Passed handlers that are not worklets. Only worklet functions are allowed. Handlers "${nonWorkletNames.join(', ')}" are not worklets.`
    );
  }
}

export const objectIs: (a: unknown, b: unknown) => boolean =
  typeof Object.is === 'function'
    ? Object.is
    : (x, y) =>
        (x === y && (x !== 0 || 1 / (x as number) === 1 / (y as number))) ||
        (Number.isNaN(x as number) && Number.isNaN(y as number));

export type WorkletClosure = Record<string, unknown>;

export function areWorkletClosuresEqual(
  next: WorkletClosure,
  prev: WorkletClosure
): boolean {
  const nextKeys = Object.keys(next);
  const prevKeys = Object.keys(prev);

  return (
    prevKeys.length === nextKeys.length &&
    prevKeys.every((key) => key in next && objectIs(next[key], prev[key]))
  );
}

export function areWorkletsEqual(
  next: WorkletFunction,
  prev: WorkletFunction
): boolean {
  if (objectIs(next, prev)) {
    return true;
  }

  return (
    next.__workletHash === prev.__workletHash &&
    areWorkletClosuresEqual(next.__closure, prev.__closure)
  );
}

export function areWorkletHandlersEqual(
  next: Partial<Record<string, WorkletFunction>> | undefined,
  prev: Partial<Record<string, WorkletFunction>> | undefined
) {
  if (!next || !prev) {
    return false;
  }

  const nextKeys = Object.keys(next);
  const prevKeys = Object.keys(prev);

  if (nextKeys.length !== prevKeys.length) {
    return false;
  }

  return nextKeys.every((key) => {
    const nextValue = next[key];
    const prevValue = prev[key];

    if (!nextValue || !prevValue) {
      return false;
    }

    return areWorkletsEqual(nextValue, prevValue);
  });
}

export function areDependenciesEqual(
  next: Array<unknown> | undefined,
  prev: Array<unknown> | undefined
): boolean {
  if (!next || !prev || next.length !== prev.length) {
    return false;
  }

  return next.every((value, index) => objectIs(value, prev[index]));
}
