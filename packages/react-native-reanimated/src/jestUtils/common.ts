'use strict';

import type { WorkletFunction } from 'react-native-worklets';

/**
 * Converts any callback function to a mock worklet function for testing
 * purposes. This function simulates a worklet by adding the required internal
 * properties.
 *
 * @param callback - Optional callback function to wrap as a worklet. If not
 *   provided, returns an empty worklet.
 * @returns A mock worklet function with the required worklet properties.
 */
export const worklet = <Args extends unknown[] = [], ReturnValue = void>(
  callback?: (...args: Args) => ReturnValue
): WorkletFunction<Args, ReturnValue> => {
  const fn = (callback ?? (() => undefined)) as WorkletFunction<
    Args,
    ReturnValue
  >;
  fn.__workletHash = Math.random();
  fn.__closure = {};
  return fn;
};
