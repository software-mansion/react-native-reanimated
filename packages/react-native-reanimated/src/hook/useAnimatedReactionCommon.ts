'use strict';
import { useEffect } from 'react';
import type { WorkletFunction } from 'react-native-worklets';

import { startMapper, stopMapper } from '../core';
import type { DependencyList } from './commonTypes';
import { useSharedValue } from './useSharedValue';

export function useAnimatedReactionBase<PreparedResult>(
  prepare: WorkletFunction<[], PreparedResult>,
  react: WorkletFunction<
    [prepare: PreparedResult, previous: PreparedResult | null],
    void
  >,
  dependencies: DependencyList,
  inputs: unknown[]
) {
  const previous = useSharedValue<PreparedResult | null>(null);

  if (dependencies === undefined) {
    dependencies = [
      ...Object.values(prepare.__closure ?? {}),
      ...Object.values(react.__closure ?? {}),
      prepare.__workletHash,
      react.__workletHash,
    ];
  } else {
    dependencies = [
      ...dependencies,
      prepare.__workletHash,
      react.__workletHash,
    ];
  }

  useEffect(() => {
    const fun = () => {
      'worklet';
      const input = prepare();
      react(input, previous.value);
      previous.value = input;
    };
    const mapperId = startMapper(fun, inputs);
    return () => {
      stopMapper(mapperId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
