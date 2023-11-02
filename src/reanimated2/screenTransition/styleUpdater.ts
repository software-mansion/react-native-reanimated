import updateProps from '../UpdateProps';
import type {
  PanGestureHandlerEventPayload,
  ScreenTransitionConfig,
} from './commonTypes';

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
    value: [{ tag: topScreenTag, name: 'RCTView' }],
  };
  updateProps(topScreenDescriptor as any, topStyle, null as any);
  const belowTopScreenTag = screenTransitionConfig.belowTopScreenTag;
  const belowTopScreenFrame =
    screenTransitionConfig.screenTransition.belowTopScreenFrame;
  const belowTopStyle = belowTopScreenFrame(event, screenSize);
  const belowTopScreenDescriptor = {
    value: [{ tag: belowTopScreenTag, name: 'RCTView' }],
  };
  updateProps(belowTopScreenDescriptor as any, belowTopStyle, null as any);
}
