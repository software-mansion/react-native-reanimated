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

const createViewDescriptor = IS_FABRIC
  ? (screenTag: number | ShadowNodeWrapper) => {
      'worklet';
      return { shadowNodeWrapper: screenTag };
    }
  : (screenTag: number | ShadowNodeWrapper) => {
      'worklet';
      return { tag: screenTag, name: 'RCTView' };
    };

export function applyStyle(
  screenTransitionConfig: ScreenTransitionConfig,
  event: PanGestureHandlerEventPayload
) {
  'worklet';
  const screenSize = screenTransitionConfig.screenDimensions;

  const topScreenId = screenTransitionConfig.topScreenId;
  const topScreenFrame = screenTransitionConfig.screenTransition.topScreenFrame;
  const topStyle = topScreenFrame(event, screenSize);
  const topScreenDescriptor = {
    value: [createViewDescriptor(topScreenId)],
  };
  updateProps(
    topScreenDescriptor as SharedValue<Descriptor[]>,
    topStyle,
    undefined
  );
  const belowTopScreenId = screenTransitionConfig.belowTopScreenId;
  const belowTopScreenFrame =
    screenTransitionConfig.screenTransition.belowTopScreenFrame;
  const belowTopStyle = belowTopScreenFrame(event, screenSize);
  const belowTopScreenDescriptor = {
    value: [createViewDescriptor(belowTopScreenId)],
  };
  updateProps(
    belowTopScreenDescriptor as SharedValue<Descriptor[]>,
    belowTopStyle,
    undefined
  );
}
