import { PanGestureHandlerEventPayload, ScreenTransitionConfig } from '../commonTypes';
import { applyStyle } from '../styleUpdater';
import { computeProgress, easing, maybeScheduleNextFrame } from './utils';

export function getSwipeLeftSimulator(
  event: PanGestureHandlerEventPayload,
  screenTransitionConfig: ScreenTransitionConfig
) {
  'worklet';
  const screenSize = screenTransitionConfig.screenDimensions;
  const startingTimestamp = _getAnimationTimestamp();
  const isTransitionCanceled = screenTransitionConfig.isTransitionCanceled;
  const startingPosition = event.translationX;
  const finalPosition = isTransitionCanceled ? 0 : -screenSize.width;
  const distance = Math.abs(finalPosition - startingPosition);

  if (isTransitionCanceled) {
    const computeFrame = () => {
      const progress = computeProgress(startingTimestamp, distance);
      let isScreenReachDestination = false;
      event.translationX = startingPosition + distance * easing(progress);
      if (event.translationX >= 0) {
        isScreenReachDestination = true;
        event.translationX = 0;
      }
      applyStyle(screenTransitionConfig, event);
      maybeScheduleNextFrame(computeFrame, isScreenReachDestination, screenTransitionConfig);
    };
    return computeFrame;
  } else {
    const computeFrame = () => {
      const progress = computeProgress(startingTimestamp, distance);
      let isScreenReachDestination = false;
      event.translationX = startingPosition - distance * easing(progress);
      if (event.translationX <= -screenSize.width) {
        isScreenReachDestination = true;
        event.translationX = -screenSize.width;
      }
      applyStyle(screenTransitionConfig, event);
      maybeScheduleNextFrame(computeFrame, isScreenReachDestination, screenTransitionConfig);
    };
    return computeFrame;
  }
}