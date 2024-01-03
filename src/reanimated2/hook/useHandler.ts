'use strict';
import { useEffect, useRef } from 'react';
import type { WorkletFunction } from '../commonTypes';
import { makeRemote } from '../core';
import { isWeb, isJest } from '../PlatformChecker';
import type { DependencyList, ReanimatedEvent } from './commonTypes';
import { areDependenciesEqual, buildDependencies } from './utils';

interface GeneralHandler<
  Event extends object,
  Context extends Record<string, unknown>
> {
  (event: ReanimatedEvent<Event>, context: Context): void;
}

type GeneralWorkletHandler<
  Event extends object,
  Context extends Record<string, unknown>
> = WorkletFunction<[event: ReanimatedEvent<Event>, context: Context]>;

type GeneralHandlers<
  Event extends object,
  Context extends Record<string, unknown>
> = Record<string, GeneralHandler<Event, Context> | undefined>;

type GeneralWorkletHandlers<
  Event extends object,
  Context extends Record<string, unknown>
> = Record<string, GeneralWorkletHandler<Event, Context> | undefined>;

interface ContextWithDependencies<Context extends Record<string, unknown>> {
  context: Context;
  savedDependencies: DependencyList;
}

export interface UseHandlerContext<Context extends Record<string, unknown>> {
  context: Context;
  doDependenciesDiffer: boolean;
  useWeb: boolean;
}

/**
 * Lets you find out whether the event handler dependencies have changed.
 *
 * @param handlers - An object of event handlers.
 * @param dependencies - An optional array of dependencies.
 * @returns An object containing a boolean indicating whether the dependencies have changed, and a boolean indicating whether the code is running on the web.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useHandler
 */
// @ts-expect-error This overload is required by our API.
export function useHandler<
  Event extends object,
  Context extends Record<string, unknown>
>(
  handlers: GeneralHandlers<Event, Context>,
  dependencies?: DependencyList
): UseHandlerContext<Context>;

export function useHandler<
  Event extends object,
  Context extends Record<string, unknown>
>(
  handlers: GeneralWorkletHandlers<Event, Context>,
  dependencies?: DependencyList
): UseHandlerContext<Context> {
  const initRef = useRef<ContextWithDependencies<Context> | null>(null);
  if (initRef.current === null) {
    initRef.current = {
      context: makeRemote<Context>({} as Context),
      savedDependencies: [],
    };
  }

  useEffect(() => {
    return () => {
      initRef.current = null;
    };
  }, []);

  const { context, savedDependencies } = initRef.current;

  dependencies = buildDependencies(
    dependencies,
    handlers as Record<string, WorkletFunction | undefined>
  );

  const doDependenciesDiffer = !areDependenciesEqual(
    dependencies,
    savedDependencies
  );
  initRef.current.savedDependencies = dependencies;
  const useWeb = isWeb() || isJest();

  return { context, doDependenciesDiffer, useWeb };
}
