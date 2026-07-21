'use strict';
import type { WorkletFunction } from 'react-native-worklets';

import type { DependencyList } from './commonTypes';
import type { DerivedValue } from './useDerivedValueCommon';
import { useDerivedValueBase } from './useDerivedValueCommon';

export type { DerivedValue } from './useDerivedValueCommon';

/**
 * Lets you create new shared values based on existing ones while keeping them
 * reactive.
 *
 * @param updater - A function called whenever at least one of the shared values
 *   or state used in the function body changes.
 * @param dependencies - An optional array of dependencies.
 * @returns A new readonly shared value based on a value returned from the
 *   updater function
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useDerivedValue
 */
// @ts-expect-error This overload is required by our API.
export function useDerivedValue<Value>(
  updater: () => Value,
  dependencies?: DependencyList
): DerivedValue<Value>;

export function useDerivedValue<Value>(
  updater: WorkletFunction<[], Value>,
  dependencies?: DependencyList
): DerivedValue<Value> {
  const inputs = Object.values(updater.__closure ?? {});

  return useDerivedValueBase(updater, dependencies, inputs);
}
