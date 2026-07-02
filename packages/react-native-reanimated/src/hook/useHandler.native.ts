'use strict';
import { useEffect, useRef } from 'react';
import type { WorkletFunction } from 'react-native-worklets';
import { makeShareable } from 'react-native-worklets';

import type { UnknownRecord } from '../common';
import type { DependencyList } from './commonTypes';
import type { GeneralHandlers, UseHandlerContext } from './useHandlerBase';
import {
  areDependenciesEqual,
  areWorkletHandlersEqual,
  ensureWorkletHandlers,
} from './useHandlerBase';

export type { UseHandlerContext } from './useHandlerBase';

function isBabelPluginEnabled(_handlers: UnknownRecord): boolean {
  // Babel plugin must be enabled in all non-web environments.
  return true;
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
    context: Context | undefined;
    prevHandlers: GeneralHandlers<Event, Context> | undefined;
    prevDependencies: DependencyList;
  } | null>(null);

  if (stateRef.current === null) {
    stateRef.current = {
      context: undefined,
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

  return {
    get context() {
      if (state.context === undefined) {
        state.context = makeShareable({} as Context);
      }
      return state.context;
    },
    doDependenciesDiffer,
  };
}
