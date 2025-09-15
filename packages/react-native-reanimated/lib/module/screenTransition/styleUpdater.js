'use strict';

import { updateProps } from '../updateProps';
function createViewDescriptor(screenId) {
  'worklet';

  return {
    shadowNodeWrapper: screenId
  };
}
function applyStyleForTopScreen(screenTransitionConfig, event) {
  'worklet';

  const {
    screenDimensions,
    topScreenId,
    screenTransition
  } = screenTransitionConfig;
  const {
    topScreenStyle: computeTopScreenStyle
  } = screenTransition;
  const topScreenStyle = computeTopScreenStyle(event, screenDimensions);
  const topScreenDescriptor = {
    value: [createViewDescriptor(topScreenId)]
  };
  updateProps(topScreenDescriptor, topScreenStyle, undefined);
}
export function applyStyleForBelowTopScreen(screenTransitionConfig, event) {
  'worklet';

  const {
    screenDimensions,
    belowTopScreenId,
    screenTransition
  } = screenTransitionConfig;
  const {
    belowTopScreenStyle: computeBelowTopScreenStyle
  } = screenTransition;
  const belowTopScreenStyle = computeBelowTopScreenStyle(event, screenDimensions);
  const belowTopScreenDescriptor = {
    value: [createViewDescriptor(belowTopScreenId)]
  };
  updateProps(belowTopScreenDescriptor, belowTopScreenStyle, undefined);
}
export function applyStyle(screenTransitionConfig, event) {
  'worklet';

  applyStyleForTopScreen(screenTransitionConfig, event);
  applyStyleForBelowTopScreen(screenTransitionConfig, event);
}
//# sourceMappingURL=styleUpdater.js.map