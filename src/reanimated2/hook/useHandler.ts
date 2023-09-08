import { useEffect, useRef } from 'react';
import type { WorkletFunction } from '../commonTypes';
import { makeRemote } from '../core';
import { isWeb, isJest } from '../PlatformChecker';
import type { DependencyList } from './commonTypes';
import { areDependenciesEqual, buildDependencies } from './utils';

interface GeneralHandler<
  Payload extends object,
  Context extends Record<string, unknown>
> {
  (eventPayload: Payload, context: Context): void;
}

type GeneralHandlers<
  Payload extends object,
  Context extends Record<string, unknown>
> = Record<string, GeneralHandler<Payload, Context> | undefined>;

interface ContextWithDependencies<Context extends Record<string, unknown>> {
  context: Context;
  savedDependencies: DependencyList;
}

export interface UseHandlerContext<Context extends Record<string, unknown>> {
  context: Context;
  doDependenciesDiffer: boolean;
  useWeb: boolean;
}

// @ts-expect-error This is fine.
export function useHandler<
  Payload extends object,
  Context extends Record<string, unknown>
>(
  handlers: GeneralHandlers<Payload, Context>,
  dependencies?: DependencyList
): UseHandlerContext<Context>;

export function useHandler<
  Payload extends object,
  Context extends Record<string, unknown>
>(
  handlers: Record<
    string,
    WorkletFunction<[eventPayload: Payload, context: Context], void>
  >,
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

// Builds one big hash from multiple worklets' hashes.
export function buildWorkletsHash(
  worklets: Record<string, WorkletFunction> | WorkletFunction[]
) {
  // For arrays `Object.values` returns the array itself.
  return Object.values(worklets).reduce(
    (accumulatedResult, worklet: WorkletFunction) =>
      accumulatedResult + worklet.__workletHash.toString(),
    ''
  );
}
