'use strict';
import { isFabric } from '../PlatformChecker';
import updateProps from '../UpdateProps';
import type {
  PanGestureHandlerEventPayload,
  ScreenTransitionConfig,
} from './commonTypes';

const IS_FABRIC = isFabric();

const createViewDescriptor: (screenTag: number) => any
  = IS_FABRIC
  ? (screenTag) => ({ shadowNodeWrapper: screenTag })
  : (screenTag) => ({ tag: screenTag, name: 'RCTView' });

export function applyStyle(
  screenTransitionConfig: ScreenTransitionConfig,
  event: PanGestureHandlerEventPayload
) {
  'worklet';
  const screenSize = screenTransitionConfig.screenDimensions;

  const topScreenTag = screenTransitionConfig.topScreenTag;
  const topScreenFrame = screenTransitionConfig.screenTransition.topScreenFrame;
  const topStyle = topScreenFrame(event, screenSize);
  const topScreenDescriptor = {
    value: [createViewDescriptor(topScreenTag)],
  };
  updateProps(topScreenDescriptor as any, topStyle, null as any);
  const belowTopScreenTag = screenTransitionConfig.belowTopScreenTag;
  const belowTopScreenFrame =
    screenTransitionConfig.screenTransition.belowTopScreenFrame;
  const belowTopStyle = belowTopScreenFrame(event, screenSize);
  const belowTopScreenDescriptor = {
    value: [createViewDescriptor(belowTopScreenTag)],
  };
  updateProps(belowTopScreenDescriptor as any, belowTopStyle, null as any);
}
