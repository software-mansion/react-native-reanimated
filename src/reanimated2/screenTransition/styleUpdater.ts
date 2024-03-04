'use strict';
import { isFabric } from '../PlatformChecker';
import updateProps from '../UpdateProps';
import type { ShadowNodeWrapper, SharedValue } from '../commonTypes';
import type { Descriptor } from '../hook/commonTypes';
import type {
  PanGestureHandlerEventPayload,
  ScreenTransitionConfig,
} from './commonTypes';

const IS_FABRIC = isFabric();

function createViewDescriptorPaper(screenId: number | ShadowNodeWrapper) {
  'worklet';
  return { tag: screenId, name: 'RCTView' };
}
function createViewDescriptorFabric(screenId: number | ShadowNodeWrapper) {
  'worklet';
  return { shadowNodeWrapper: screenId };
}
const createViewDescriptor = IS_FABRIC
  ? createViewDescriptorFabric
  : createViewDescriptorPaper;

export function applyStyle(
  screenTransitionConfig: ScreenTransitionConfig,
  event: PanGestureHandlerEventPayload
) {
  'worklet';
  const screenDimensions = screenTransitionConfig.screenDimensions;

  const topScreenId = screenTransitionConfig.topScreenId;
  const topScreenFrame = screenTransitionConfig.screenTransition.topScreenFrame;
  const topScreenStyle = topScreenFrame(event, screenDimensions);
  const topScreenDescriptor = {
    value: [createViewDescriptor(topScreenId)],
  };
  updateProps(
    topScreenDescriptor as SharedValue<Descriptor[]>,
    topScreenStyle,
    undefined
  );

  const belowTopScreenId = screenTransitionConfig.belowTopScreenId;
  const belowTopScreenFrame =
    screenTransitionConfig.screenTransition.belowTopScreenFrame;
  const belowTopScreenStyle = belowTopScreenFrame(event, screenDimensions);
  const belowTopScreenDescriptor = {
    value: [createViewDescriptor(belowTopScreenId)],
  };
  updateProps(
    belowTopScreenDescriptor as SharedValue<Descriptor[]>,
    belowTopScreenStyle,
    undefined
  );
}
