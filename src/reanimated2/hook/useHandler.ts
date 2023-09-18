'use strict';
import { useEffect, useRef } from 'react';
import type { __Context, __WorkletFunction } from '../commonTypes';
import { makeRemote } from '../core';
import { isWeb, isJest } from '../PlatformChecker';
import type { ContextWithDependencies, DependencyList } from './commonTypes';
import { areDependenciesEqual, buildDependencies } from './utils';
interface Handler<T, TContext extends __Context> extends __WorkletFunction {
  (event: T, context: TContext): void;
}

interface Handlers<T, TContext extends __Context> {
  [key: string]: Handler<T, TContext> | undefined;
}

export interface UseHandlerContext<TContext extends __Context> {
  context: TContext;
  doDependenciesDiffer: boolean;
  useWeb: boolean;
}

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
type useHandlerType = <T, TContext extends __Context = Record<string, never>>(
  handlers: Handlers<T, TContext>,
  deps?: DependencyList
) => { context: TContext; doDependenciesDiffer: boolean; useWeb: boolean };

export const useHandler = function <T, TContext extends __Context>(
  handlers: Handlers<T, TContext>,
  dependencies?: DependencyList
): UseHandlerContext<TContext> {
  const initRef = useRef<ContextWithDependencies<TContext> | null>(null);
  if (initRef.current === null) {
    initRef.current = {
      context: makeRemote<TContext>({} as TContext),
      savedDependencies: [],
    };
  }

  useEffect(() => {
    return () => {
      initRef.current = null;
    };
  }, []);

  const { context, savedDependencies } = initRef.current;

  // This will be amended in the following PRs in this series (and this comment will be gone);
  dependencies = buildDependencies(dependencies, handlers as any);

  const doDependenciesDiffer = !areDependenciesEqual(
    dependencies,
    savedDependencies
  );
  initRef.current.savedDependencies = dependencies;
  const useWeb = isWeb() || isJest();

  return { context, doDependenciesDiffer, useWeb };
  // TODO TYPESCRIPT This temporary cast is to get rid of .d.ts file.
} as useHandlerType;
