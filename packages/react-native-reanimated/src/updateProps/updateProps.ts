'use strict';

import { IS_JEST } from '../common';
import { processBoxShadowWeb, processFilterWeb } from '../common/web';
import type { PropUpdates } from '../createAnimatedComponent/commonTypes';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import { _updatePropsJS } from '../ReanimatedModule/js-reanimated';
import type { ViewDescriptorsWrapper } from './updatePropsCommon';
import { makeUpdatePropsJestWrapper } from './updatePropsCommon';

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

export const updatePropsJestWrapper = makeUpdatePropsJestWrapper(updateProps);

export default updateProps;

const maybeThrowError = () => {
  // Jest attempts to access a property of this object to check if it is a Jest mock
  // so we can't throw an error in the getter.
  if (!IS_JEST) {
    throw new Error(
      '[Reanimated] `UpdatePropsManager` is not available on non-native platform.'
    );
  }
};

// is-tree-shakable-suppress
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
