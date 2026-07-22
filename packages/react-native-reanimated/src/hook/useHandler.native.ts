'use strict';
import { useEffect, useRef } from 'react';
import type { WorkletFunction } from 'react-native-worklets';
import { makeShareable } from 'react-native-worklets';

import type { UnknownRecord } from '../common';
import type { DependencyList } from './commonTypes';
import type { GeneralHandlers, UseHandlerContext } from './useHandlerCommon';
import {
  areWorkletHandlersEqual,
  ensureWorkletHandlers,
} from './useHandlerCommon';

export type { UseHandlerContext } from './useHandlerCommon';

/**
 * Lets you find out whether the event handler dependencies have changed.
 *
 * @param handlers - An object of event handlers.
 * @param dependencies - An optional array of dependencies. Only relevant when
 *   using Reanimated without the Babel plugin on the Web.
 * @returns An object containing a boolean indicating whether the dependencies
 *   have changed.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useHandler
 */
export function useHandler<Event extends object, Context extends UnknownRecord>(
  handlers: GeneralHandlers<Event, Context>,
  _dependencies?: DependencyList
): UseHandlerContext<Context> {
  'use no memo';

  const stateRef = useRef<{
    context: Context | undefined;
    prevHandlers: GeneralHandlers<Event, Context> | undefined;
  } | null>(null);

  if (stateRef.current === null) {
    stateRef.current = {
      context: undefined,
      prevHandlers: undefined,
    };
  }

  const state = stateRef.current;

  if (__DEV__) {
    ensureWorkletHandlers(handlers);
  }
  const doDependenciesDiffer = !areWorkletHandlersEqual(
    handlers as Record<string, WorkletFunction>,
    state.prevHandlers as Record<string, WorkletFunction>
  );

  // Write after commit to avoid corruption from interrupted renders (in case of concurrent mode).
  useEffect(() => {
    state.prevHandlers = handlers;
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
