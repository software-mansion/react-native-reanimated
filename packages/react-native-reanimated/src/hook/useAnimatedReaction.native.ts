'use strict';
import type { WorkletFunction } from 'react-native-worklets';

import { logger } from '../common';
import type { DependencyList } from './commonTypes';
import { useAnimatedReactionBase } from './useAnimatedReactionCommon';

/**
 * Lets you to respond to changes in a [shared
 * value](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value).
 * It's especially useful when comparing values previously stored in the shared
 * value with the current one.
 *
 * @param prepare - A function that should return a value to which you'd like to
 *   react.
 * @param react - A function that reacts to changes in the value returned by the
 *   `prepare` function.
 * @param dependencies - An optional array of dependencies. Only relevant when
 *   using Reanimated without the Babel plugin on the Web.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useAnimatedReaction
 */
// @ts-expect-error This overload is required by our API.
export function useAnimatedReaction<PreparedResult>(
  prepare: () => PreparedResult,
  react: (prepared: PreparedResult, previous: PreparedResult | null) => void,
  dependencies?: DependencyList
): void;

export function useAnimatedReaction<PreparedResult>(
  prepare: WorkletFunction<[], PreparedResult>,
  react: WorkletFunction<
    [prepare: PreparedResult, previous: PreparedResult | null],
    void
  >,
  _dependencies?: DependencyList
) {
  if (__DEV__ && _dependencies !== undefined) {
    logger.warn('dependencies should only be used in web implementation.');
  }

  const inputs = Object.values(prepare.__closure ?? {});

  useAnimatedReactionBase(prepare, react, undefined, inputs);
}
