'use strict';
import type { UnknownRecord } from '../common';
import type { DependencyList } from './commonTypes';
import type { GeneralHandlers, UseHandlerContext } from './useHandlerCommon';
import { useHandlerBase } from './useHandlerCommon';

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
  // The Babel plugin is always enabled outside of the web, so handlers are
  // always compared instead of the dependencies.
  return useHandlerBase(handlers, undefined, true);
}
