'use strict';

import type { RefObject } from 'react';

import { IS_JEST } from '../common';
import { processBoxShadowWeb, processFilterWeb } from '../common/web';
import type { AnimatedStyle } from '../commonTypes';
import type { PropUpdates } from '../createAnimatedComponent/commonTypes';
import type { Descriptor } from '../hook/commonTypes';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import { _updatePropsJS } from '../ReanimatedModule/js-reanimated';

const updateProps: (
  viewDescriptors: ViewDescriptorsWrapper,
  updates: PropUpdates,
  isAnimatedProps?: boolean
) => void = (viewDescriptors, updates, isAnimatedProps) => {
  'worklet';
  viewDescriptors.value?.forEach((viewDescriptor) => {
    const component = viewDescriptor.tag as ReanimatedHTMLElement;
    if ('boxShadow' in updates) {
      updates.boxShadow = processBoxShadowWeb(updates.boxShadow);
    }
    if ('filter' in updates) {
      updates.filter = processFilterWeb(updates.filter);
    }
    _updatePropsJS(updates, component, isAnimatedProps);
  });
};

export const updatePropsJestWrapper = (
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

export default updateProps;

// is-tree-shakable-suppress
const maybeThrowError = () => {
  // Jest attempts to access a property of this object to check if it is a Jest mock
  // so we can't throw an error in the getter.
  if (!IS_JEST) {
    throw new Error(
      '[Reanimated] `UpdatePropsManager` is not available on non-native platform.'
    );
  }
};
global.UpdatePropsManager = new Proxy(
  {},
  {
    get: maybeThrowError,
    set: () => {
      maybeThrowError();
      return false;
    },
  }
);

/**
 * This used to be `SharedValue<Descriptors[]>` but objects holding just a
 * single `value` prop are fine too.
 */
interface ViewDescriptorsWrapper {
  value: Readonly<Descriptor[]>;
}
