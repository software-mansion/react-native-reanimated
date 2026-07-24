'use strict';

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
