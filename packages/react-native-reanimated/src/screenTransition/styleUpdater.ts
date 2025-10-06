'use strict';
import type { ShadowNodeWrapper } from '../commonTypes';
import type { Descriptor } from '../hook/commonTypes';
import { updateProps } from '../updateProps';
import type {
  PanGestureHandlerEventPayload,
  ScreenTransitionConfig,
} from './commonTypes';

function createViewDescriptor(screenId: number | ShadowNodeWrapper) {
  'worklet';
  return { shadowNodeWrapper: screenId };
}

function applyStyleForTopScreen(
  screenTransitionConfig: ScreenTransitionConfig,
  event: PanGestureHandlerEventPayload
) {
  'worklet';
  const { screenDimensions, topScreenId, screenTransition } =
    screenTransitionConfig;
  const { topScreenStyle: computeTopScreenStyle } = screenTransition;
  const topScreenStyle = computeTopScreenStyle(event, screenDimensions);
  const viewDescriptorsArray = [
    createViewDescriptor(topScreenId) as Descriptor,
  ];
  const topScreenDescriptor = {
    toArray: () => viewDescriptorsArray,
  };
  updateProps(topScreenDescriptor, topScreenStyle, undefined);
}

export function applyStyleForBelowTopScreen(
  screenTransitionConfig: ScreenTransitionConfig,
  event: PanGestureHandlerEventPayload
) {
  'worklet';
  const { screenDimensions, belowTopScreenId, screenTransition } =
    screenTransitionConfig;
  const { belowTopScreenStyle: computeBelowTopScreenStyle } = screenTransition;
  const belowTopScreenStyle = computeBelowTopScreenStyle(
    event,
    screenDimensions
  );
  const viewDescriptorsArray = [
    createViewDescriptor(belowTopScreenId) as Descriptor,
  ];
  const belowTopScreenDescriptor = {
    toArray: () => viewDescriptorsArray,
  };
  updateProps(belowTopScreenDescriptor, belowTopScreenStyle, undefined);
}

export function applyStyle(
  screenTransitionConfig: ScreenTransitionConfig,
  event: PanGestureHandlerEventPayload
) {
  'worklet';
  applyStyleForTopScreen(screenTransitionConfig, event);
  applyStyleForBelowTopScreen(screenTransitionConfig, event);
}
