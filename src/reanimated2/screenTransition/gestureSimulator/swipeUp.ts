import type {
  PanGestureHandlerEventPayload,
  ScreenTransitionConfig,
} from '../commonTypes';
import { applyStyle } from '../styleUpdater';
import { computeProgress, easing, maybeScheduleNextFrame } from './utils';

export function getSwipeUpSimulator(
  event: PanGestureHandlerEventPayload,
  screenTransitionConfig: ScreenTransitionConfig
) {
  'worklet';
  const screenSize = screenTransitionConfig.screenDimensions;
  const startingTimestamp = _getAnimationTimestamp();
  const isTransitionCanceled = screenTransitionConfig.isTransitionCanceled;
  const startingPosition = event.translationY;
  const finalPosition = isTransitionCanceled ? 0 : -screenSize.height;
  const distance = Math.abs(finalPosition - startingPosition);

  if (isTransitionCanceled) {
    const computeFrame = () => {
      const progress = computeProgress(startingTimestamp, distance);
      let isScreenReachDestination = false;
      event.translationY = startingPosition + distance * easing(progress);
      if (event.translationY > 0) {
        isScreenReachDestination = true;
        event.translationY = 0;
      }
      applyStyle(screenTransitionConfig, event);
      maybeScheduleNextFrame(
        computeFrame,
        isScreenReachDestination,
        screenTransitionConfig
      );
    };
    return computeFrame;
  } else {
    const computeFrame = () => {
      const progress = computeProgress(startingTimestamp, distance);
      let isScreenReachDestination = false;
      event.translationY = startingPosition - distance * easing(progress);
      if (event.translationY < -screenSize.height) {
        isScreenReachDestination = true;
        event.translationY = -screenSize.height;
      }
      applyStyle(screenTransitionConfig, event);
      maybeScheduleNextFrame(
        computeFrame,
        isScreenReachDestination,
        screenTransitionConfig
      );
    };
    return computeFrame;
  }
}
