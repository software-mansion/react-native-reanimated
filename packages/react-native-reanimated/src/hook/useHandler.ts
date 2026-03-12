'use strict';
import { useEffect, useRef } from 'react';
import { isWorkletFunction, makeShareable } from 'react-native-worklets';

import type { UnknownRecord } from '../common';
import { IS_WEB, ReanimatedError } from '../common';
import type { DependencyList, ReanimatedEvent } from './commonTypes';
import { areDependenciesEqual, areRecordValuesEqual } from './utils';

interface GeneralHandler<Event extends object, Context extends UnknownRecord> {
  (event: ReanimatedEvent<Event>, context: Context): void;
}

type GeneralHandlers<
  Event extends object,
  Context extends UnknownRecord,
> = Record<string, GeneralHandler<Event, Context> | undefined>;

export interface UseHandlerContext<Context extends UnknownRecord> {
  context: Context;
  doDependenciesDiffer: boolean;
}

function validateHandlers(handlers: UnknownRecord) {
  const nonWorkletNames = Object.entries(handlers)
    .filter(([, handler]) => !isWorkletFunction(handler))
    .map(([name]) => name);

  if (nonWorkletNames.length > 0) {
    throw new ReanimatedError(
      `Passed handlers that are not worklets. Only worklet functions are allowed. Handlers "${nonWorkletNames.join(', ')}" are not worklets.`
    );
  }
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

  if (!IS_WEB) {
    if (__DEV__) {
      validateHandlers(handlers);
    }
    doDependenciesDiffer = !areRecordValuesEqual(handlers, state.prevHandlers);
  } else if (Object.values(handlers).every(isWorkletFunction)) {
    doDependenciesDiffer = !areRecordValuesEqual(handlers, state.prevHandlers);
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
