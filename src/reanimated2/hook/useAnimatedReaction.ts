'use strict';
import { useEffect } from 'react';
import type { WorkletFunction } from '../commonTypes';
import { startMapper, stopMapper } from '../core';
import type { DependencyList } from './commonTypes';
import { useSharedValue } from './useSharedValue';
import { shouldBeUseWeb } from '../PlatformChecker';

/**
 * @param prepare - worklet used for data preparation for the second parameter
 * @param react - worklet which takes data prepared by the one in the first parameter and performs certain actions
 * the first worklet defines the inputs, in other words on which shared values change will it be called.
 * the second one can modify any shared values but those which are mentioned in the first worklet. Beware of that, because this may result in endless loop and high cpu usage.
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
  dependencies?: DependencyList
) {
  const previous = useSharedValue<PreparedResult | null>(null, true);

  let inputs = Object.values(prepare.__closure ?? {});

  if (shouldBeUseWeb()) {
    if (!inputs.length && dependencies?.length) {
      // let web work without a Reanimated Babel plugin
      inputs = dependencies;
    }
  }

  if (dependencies === undefined) {
    dependencies = [
      ...Object.values(prepare.__closure ?? {}),
      ...Object.values(react.__closure ?? {}),
      prepare.__workletHash,
      react.__workletHash,
    ];
  } else {
    dependencies.push(prepare.__workletHash, react.__workletHash);
  }

  useEffect(() => {
    const fun = () => {
      'worklet';
      const input = prepare();
      react(input, previous.value);
      previous.value = input;
    };
    const mapperId = startMapper(fun, inputs, []);
    return () => {
      stopMapper(mapperId);
    };
  }, dependencies);
}
