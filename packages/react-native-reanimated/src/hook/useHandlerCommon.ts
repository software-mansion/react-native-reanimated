'use strict';
import { isWorkletFunction } from 'react-native-worklets';

import type { UnknownRecord } from '../common';
import type { ReanimatedEvent } from './commonTypes';

interface GeneralHandler<
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

export function getDefinedHandlers<THandler>(
  handlers: Partial<Record<string, THandler>>
): [string, THandler][] {
  return Object.entries(handlers).filter(
    (entry): entry is [string, THandler] => entry[1] !== undefined
  );
}

export function ensureWorkletHandlers(handlers: UnknownRecord) {
  const nonWorkletNames = getDefinedHandlers(handlers)
    .filter(([, handler]) => !isWorkletFunction(handler))
    .map(([name]) => name);

  if (nonWorkletNames.length > 0) {
    throw new Error(
      `[Reanimated] Passed handlers that are not worklets. Only worklet functions are allowed. Handlers "${nonWorkletNames.join(', ')}" are not worklets.`
    );
  }
}

const objectIs: (a: unknown, b: unknown) => boolean =
  typeof Object.is === 'function'
    ? Object.is
    : (x, y) =>
        (x === y && (x !== 0 || 1 / (x as number) === 1 / (y as number))) ||
        (Number.isNaN(x as number) && Number.isNaN(y as number));

const areWorkletClosuresEqual = areDependenciesEqual;

function areHandlersEqual(next: unknown, prev: unknown): boolean {
  if (objectIs(next, prev)) {
    return true;
  }

  return (
    isWorkletFunction(next) &&
    isWorkletFunction(prev) &&
    next.__workletHash === prev.__workletHash &&
    ((next.__closure === undefined && prev.__closure === undefined) ||
      areWorkletClosuresEqual(next.__closure, prev.__closure))
  );
}

export function areWorkletHandlersEqual(
  next: UnknownRecord | undefined,
  prev: UnknownRecord | undefined
) {
  if (!next || !prev) {
    return false;
  }

  const nextHandlers = getDefinedHandlers(next);

  if (nextHandlers.length !== getDefinedHandlers(prev).length) {
    return false;
  }

  return nextHandlers.every(([key, nextValue]) =>
    areHandlersEqual(nextValue, prev[key])
  );
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
