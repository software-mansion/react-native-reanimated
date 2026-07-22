'use strict';
import { isWorkletFunction } from 'react-native-worklets';

import type { UnknownRecord } from '../common';
import type { DependencyList } from './commonTypes';
import type { GeneralHandlers, UseHandlerContext } from './useHandlerCommon';
import { useHandlerBase } from './useHandlerCommon';

export type { UseHandlerContext } from './useHandlerCommon';

function isBabelPluginEnabled(handlers: UnknownRecord): boolean {
  const handlerFunctions = Object.values(handlers);
  // If there is no function provided, we assume that the Babel plugin is enabled.
  return (
    handlerFunctions.length === 0 || handlerFunctions.some(isWorkletFunction)
  );
}

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
  dependencies?: DependencyList
): UseHandlerContext<Context> {
  return useHandlerBase(handlers, dependencies, isBabelPluginEnabled(handlers));
}
