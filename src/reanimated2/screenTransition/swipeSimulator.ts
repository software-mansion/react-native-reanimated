'use strict';
import type {
  PanGestureHandlerEventPayload,
  ScreenTransitionConfig,
} from './commonTypes';
import { ScreenTransitionCommand } from './commonTypes';
import { applyStyle } from './styleUpdater';

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
  isTransitionCanceled: boolean
) {
  'worklet';
  const screenWidth = screenTransitionConfig.screenDimensions.width;
  const progressX = Math.abs(event.translationX / screenWidth);
  const screenHeight = screenTransitionConfig.screenDimensions.height;
  const progressY = Math.abs(event.translationY / screenHeight);
  const progress = isTransitionCanceled
    ? Math.max(progressX, progressY) / 2
    : Math.max(progressX, progressY);
  return progress;
}

function maybeScheduleNextFrame(
  step: () => void,
  didScreenReachDestination: boolean,
  screenTransitionConfig: ScreenTransitionConfig,
  event: PanGestureHandlerEventPayload,
  isTransitionCanceled: boolean
) {
  'worklet';
  if (!didScreenReachDestination) {
    const stackTag = screenTransitionConfig.stackTag;
    const progress = computeProgress(
      screenTransitionConfig,
      event,
      isTransitionCanceled
    );
    global._manageScreenTransition(
      ScreenTransitionCommand.Update,
      stackTag,
      progress
    );
    requestAnimationFrame(step);
  } else {
    if (screenTransitionConfig.onFinishAnimation) {
      screenTransitionConfig.onFinishAnimation();
    }
  }
}

export function swipeSimulator(
  event: PanGestureHandlerEventPayload,
  screenTransitionConfig: ScreenTransitionConfig,
  lockAxis?: 'x' | 'y' | undefined
) {
  'worklet';
  const screenSize = screenTransitionConfig.screenDimensions;
  const startingTimestamp = _getAnimationTimestamp();
  const isTransitionCanceled = screenTransitionConfig.isTransitionCanceled;
  const startingPosition = {
    x: event.translationX,
    y: event.translationY,
  };
  const direction = {
    x: event.translationX > 0 ? 1 : -1,
    y: event.translationY > 0 ? 1 : -1,
  };
  const finalPosition = isTransitionCanceled
    ? { x: 0, y: 0 }
    : { x: direction.x * screenSize.width, y: direction.y * screenSize.height };
  const distance = {
    x: Math.abs(finalPosition.x - startingPosition.x),
    y: Math.abs(finalPosition.y - startingPosition.y),
  };
  const didScreenReachDestination = {
    x: false,
    y: false,
  };
  const BASE_VELOCITY = 300;
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
  if (isTransitionCanceled) {
    const didScreenReachDestinationCheck = !lockAxis
      ? () => {
          return didScreenReachDestination.x && didScreenReachDestination.y;
        }
      : lockAxis === 'x'
      ? () => {
          return didScreenReachDestination.x;
        }
      : () => {
          return didScreenReachDestination.y;
        };
    const computeFrame = () => {
      const progress = {
        x: computeEasingProgress(startingTimestamp, distance.x, velocity.x),
        y: computeEasingProgress(startingTimestamp, distance.y, velocity.y),
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
        isTransitionCanceled
      );
    };
    return computeFrame;
  } else {
    const computeFrame = () => {
      const progress = {
        x: computeEasingProgress(startingTimestamp, distance.x, velocity.x),
        y: computeEasingProgress(startingTimestamp, distance.y, velocity.y),
      };
      event.translationX =
        startingPosition.x + direction.x * distance.x * easing(progress.x);
      event.translationY =
        startingPosition.y + direction.y * distance.y * easing(progress.y);
      if (direction.x > 0) {
        if (event.translationX >= screenSize.width) {
          didScreenReachDestination.x = true;
          event.translationX = screenSize.width;
        }
      } else {
        if (event.translationX <= -screenSize.width) {
          didScreenReachDestination.x = true;
          event.translationX = -screenSize.width;
        }
      }
      if (direction.y > 0) {
        if (event.translationY >= screenSize.height) {
          didScreenReachDestination.y = true;
          event.translationY = screenSize.height;
        }
      } else {
        if (event.translationY <= -screenSize.height) {
          didScreenReachDestination.y = true;
          event.translationY = -screenSize.height;
        }
      }
      applyStyle(screenTransitionConfig, event);
      maybeScheduleNextFrame(
        computeFrame,
        didScreenReachDestination.x || didScreenReachDestination.y,
        screenTransitionConfig,
        event,
        isTransitionCanceled
      );
    };
    return computeFrame;
  }
}
