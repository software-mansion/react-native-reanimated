'use strict';
import type {
  PanGestureHandlerEventPayload,
  ScreenTransitionConfig,
  LockAxis,
} from './commonTypes';
import { applyStyle } from './styleUpdater';
import { RNScreensTurboModule } from './RNScreensTurboModule';

const BASE_VELOCITY = 300;

function computeEasingProgress(
  startingTimestamp: number,
  distance: number,
  velocity: number
) {
  'worklet';
  if (Math.abs(distance) < 1) {
    return 1;
  }
  const elapsedTime = (_getAnimationTimestamp() - startingTimestamp) / 1000;
  const currentPosition = velocity * elapsedTime;
  const progress = currentPosition / distance;
  return progress;
}

function easing(x: number): number {
  'worklet';
  // based on https://easings.net/#easeOutQuart
  return 1 - Math.pow(1 - x, 5);
}

function computeProgress(
  screenTransitionConfig: ScreenTransitionConfig,
  event: PanGestureHandlerEventPayload,
  isTransitionCancelled: boolean
) {
  'worklet';
  const screenDimensions = screenTransitionConfig.screenDimensions;
  const progressX = Math.abs(event.translationX / screenDimensions.width);
  const progressY = Math.abs(event.translationY / screenDimensions.height);
  const maxProgress = Math.max(progressX, progressY);
  const progress = isTransitionCancelled ? maxProgress / 2 : maxProgress;
  return progress;
}

function maybeScheduleNextFrame(
  step: () => void,
  didScreenReachDestination: boolean,
  screenTransitionConfig: ScreenTransitionConfig,
  event: PanGestureHandlerEventPayload,
  isTransitionCancelled: boolean
) {
  'worklet';
  if (!didScreenReachDestination) {
    const stackTag = screenTransitionConfig.stackTag;
    const progress = computeProgress(
      screenTransitionConfig,
      event,
      isTransitionCancelled
    );
    RNScreensTurboModule.updateTransition(stackTag, progress);
    requestAnimationFrame(step);
  } else {
    screenTransitionConfig.onFinishAnimation?.();
  }
}

export function getSwipeSimulator(
  event: PanGestureHandlerEventPayload,
  screenTransitionConfig: ScreenTransitionConfig,
  lockAxis?: LockAxis
) {
  'worklet';
  const screenDimensions = screenTransitionConfig.screenDimensions;
  const startTimestamp = _getAnimationTimestamp();
  const { isTransitionCancelled } = screenTransitionConfig;
  const startingPosition = {
    x: event.translationX,
    y: event.translationY,
  };
  const direction = {
    x: Math.sign(event.translationX),
    y: Math.sign(event.translationY),
  };
  const finalPosition = isTransitionCancelled
    ? { x: 0, y: 0 }
    : {
        x: direction.x * screenDimensions.width,
        y: direction.y * screenDimensions.height,
      };
  const distance = {
    x: Math.abs(finalPosition.x - startingPosition.x),
    y: Math.abs(finalPosition.y - startingPosition.y),
  };
  const didScreenReachDestination = {
    x: false,
    y: false,
  };
  const velocity = { x: BASE_VELOCITY, y: BASE_VELOCITY };
  if (lockAxis === 'x') {
    velocity.y = 0;
  } else if (lockAxis === 'y') {
    velocity.x = 0;
  } else {
    if (Math.abs(startingPosition.x) > Math.abs(startingPosition.y)) {
      velocity.x = BASE_VELOCITY;
      velocity.y =
        BASE_VELOCITY * Math.abs(startingPosition.y / startingPosition.x);
    } else {
      velocity.x =
        BASE_VELOCITY * Math.abs(startingPosition.x / startingPosition.y);
      velocity.y = BASE_VELOCITY;
    }
  }

  if (isTransitionCancelled) {
    function didScreenReachDestinationCheck() {
      if (lockAxis === 'x') {
        return didScreenReachDestination.x;
      } else if (lockAxis === 'y') {
        return didScreenReachDestination.y;
      } else {
        return didScreenReachDestination.x && didScreenReachDestination.y;
      }
    }
    function computeFrame() {
      const progress = {
        x: computeEasingProgress(startTimestamp, distance.x, velocity.x),
        y: computeEasingProgress(startTimestamp, distance.y, velocity.y),
      };
      event.translationX =
        startingPosition.x - direction.x * distance.x * easing(progress.x);
      event.translationY =
        startingPosition.y - direction.y * distance.y * easing(progress.y);
      if (direction.x > 0) {
        if (event.translationX <= 0) {
          didScreenReachDestination.x = true;
          event.translationX = 0;
        }
      } else {
        if (event.translationX >= 0) {
          didScreenReachDestination.x = true;
          event.translationX = 0;
        }
      }
      if (direction.y > 0) {
        if (event.translationY <= 0) {
          didScreenReachDestination.y = true;
          event.translationY = 0;
        }
      } else {
        if (event.translationY >= 0) {
          didScreenReachDestination.y = true;
          event.translationY = 0;
        }
      }
      applyStyle(screenTransitionConfig, event);
      maybeScheduleNextFrame(
        computeFrame,
        didScreenReachDestinationCheck(),
        screenTransitionConfig,
        event,
        isTransitionCancelled
      );
    }
    return computeFrame;
  } else {
    function computeFrame() {
      const progress = {
        x: computeEasingProgress(startTimestamp, distance.x, velocity.x),
        y: computeEasingProgress(startTimestamp, distance.y, velocity.y),
      };
      event.translationX =
        startingPosition.x + direction.x * distance.x * easing(progress.x);
      event.translationY =
        startingPosition.y + direction.y * distance.y * easing(progress.y);
      if (direction.x > 0) {
        if (event.translationX >= screenDimensions.width) {
          didScreenReachDestination.x = true;
          event.translationX = screenDimensions.width;
        }
      } else {
        if (event.translationX <= -screenDimensions.width) {
          didScreenReachDestination.x = true;
          event.translationX = -screenDimensions.width;
        }
      }
      if (direction.y > 0) {
        if (event.translationY >= screenDimensions.height) {
          didScreenReachDestination.y = true;
          event.translationY = screenDimensions.height;
        }
      } else {
        if (event.translationY <= -screenDimensions.height) {
          didScreenReachDestination.y = true;
          event.translationY = -screenDimensions.height;
        }
      }
      applyStyle(screenTransitionConfig, event);
      maybeScheduleNextFrame(
        computeFrame,
        didScreenReachDestination.x || didScreenReachDestination.y,
        screenTransitionConfig,
        event,
        isTransitionCancelled
      );
    }
    return computeFrame;
  }
}
