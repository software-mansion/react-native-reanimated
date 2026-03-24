'use strict';
import { useEffect, useRef } from 'react';
import type { WorkletFunction } from 'react-native-worklets';
import { isWorkletFunction, makeShareable } from 'react-native-worklets';
import type { WorkletClosure } from 'react-native-worklets/lib/typescript/types';

import type { UnknownRecord } from '../common';
import { IS_WEB, ReanimatedError } from '../common';
import type { DependencyList, ReanimatedEvent } from './commonTypes';

interface GeneralHandler<
  TEvent extends object,
  TContext extends UnknownRecord,
> {
  (event: ReanimatedEvent<TEvent>, context: TContext): void;
}

type GeneralHandlers<
  TEvent extends object,
  TContext extends UnknownRecord,
> = Record<string, GeneralHandler<TEvent, TContext> | undefined>;

export interface UseHandlerContext<TContext extends UnknownRecord> {
  context: TContext;
  doDependenciesDiffer: boolean;
}

function isBabelPluginEnabled(handlers: UnknownRecord): boolean {
  if (!IS_WEB) {
    // Babel plugin must be enabled in all non-web environments.
    return true;
  }

  const handlerFunctions = Object.values(handlers);
  // If there is no function provided, we assume that the Babel plugin is enabled.
  return (
    handlerFunctions.length === 0 || handlerFunctions.some(isWorkletFunction)
  );
}

function ensureWorkletHandlers(handlers: UnknownRecord) {
  const nonWorkletNames = Object.entries(handlers).reduce<string[]>(
    (acc, [name, handler]) => {
      if (!isWorkletFunction(handler)) acc.push(name);
      return acc;
    },
    []
  );

  if (nonWorkletNames.length > 0) {
    throw new ReanimatedError(
      `Passed handlers that are not worklets. Only worklet functions are allowed. Handlers "${nonWorkletNames.join(', ')}" are not worklets.`
    );
  }
}

const objectIs: (a: unknown, b: unknown) => boolean =
  typeof Object.is === 'function'
    ? Object.is
    : (x, y) =>
        (x === y && (x !== 0 || 1 / (x as number) === 1 / (y as number))) ||
        (Number.isNaN(x as number) && Number.isNaN(y as number));

function areWorkletClosuresEqual(
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

function areWorkletsEqual(
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

function areWorkletHandlersEqual(
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

function areDependenciesEqual(
  next: Array<unknown> | undefined,
  prev: Array<unknown> | undefined
): boolean {
  if (!next || !prev || next.length !== prev.length) {
    return false;
  }

  return next.every((value, index) => objectIs(value, prev[index]));
}

/**
 * Lets you find out whether the event handler dependencies have changed.
 *
 * @param handlers - An object of event handlers.
 * @param dependencies - An optional array of dependencies.
 * @returns An object containing a boolean indicating whether the dependencies
 *   have changed.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useHandler
 */
export function useHandler<Event extends object, Context extends UnknownRecord>(
  handlers: GeneralHandlers<Event, Context>,
  dependencies?: DependencyList
): UseHandlerContext<Context> {
  'use no memo';

  const stateRef = useRef<{
    context: Context;
    prevHandlers: GeneralHandlers<Event, Context> | undefined;
    prevDependencies: DependencyList;
  } | null>(null);

  if (stateRef.current === null) {
    stateRef.current = {
      context: makeShareable({} as Context),
      prevHandlers: undefined,
      prevDependencies: [],
    };
  }

  const state = stateRef.current;
  let doDependenciesDiffer = true;

  if (isBabelPluginEnabled(handlers)) {
    if (__DEV__) {
      ensureWorkletHandlers(handlers);
    }
    doDependenciesDiffer = !areWorkletHandlersEqual(
      handlers as Record<string, WorkletFunction>,
      state.prevHandlers as Record<string, WorkletFunction>
    );
  } else if (dependencies) {
    doDependenciesDiffer = !areDependenciesEqual(
      dependencies,
      state.prevDependencies
    );
  }

  // Write after commit to avoid corruption from interrupted renders (in case of concurrent mode).
  useEffect(() => {
    state.prevHandlers = handlers;
    state.prevDependencies = dependencies;
  });

  return { context: state.context, doDependenciesDiffer };
}
