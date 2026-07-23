'use strict';
import type { RefObject } from 'react';

import type { AnimatedStyle } from '../commonTypes';
import type { PropUpdates } from '../createAnimatedComponent/commonTypes';
import type { Descriptor } from '../hook/commonTypes';

/**
 * This used to be `SharedValue<Descriptors[]>` but objects holding just a
 * single `value` prop are fine too.
 */
export interface ViewDescriptorsWrapper {
  value: Readonly<Descriptor[]>;
}

type UpdateProps = (
  viewDescriptors: ViewDescriptorsWrapper,
  updates: PropUpdates,
  isAnimatedProps?: boolean
) => void;

export function makeUpdatePropsJestWrapper(updateProps: UpdateProps) {
  return (
    viewDescriptors: ViewDescriptorsWrapper,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updates: AnimatedStyle<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    animatedValues: RefObject<AnimatedStyle<any>>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adapters: ((updates: AnimatedStyle<any>) => void)[]
  ): void => {
    adapters.forEach((adapter) => {
      adapter(updates);
    });
    animatedValues.current.value = {
      ...animatedValues.current.value,
      ...updates,
    };

    updateProps(viewDescriptors, updates);
  };
}
