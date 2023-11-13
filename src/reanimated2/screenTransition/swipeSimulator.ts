import type {
  PanGestureHandlerEventPayload,
  ScreenTransitionConfig,
} from './commonTypes';
import { applyStyle } from './styleUpdater';

function computeProgress(
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
  return 1 - Math.pow(1 - x, 5);
}

function maybeScheduleNextFrame(
  step: () => void,
  isScreenReachDestination: boolean,
  screenTransitionConfig: ScreenTransitionConfig
) {
  'worklet';
  if (!isScreenReachDestination) {
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
  const isScreenReachDestination = {
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
    const isScreenReachDestinationCheck = !lockAxis
      ? () => {
          return isScreenReachDestination.x && isScreenReachDestination.y;
        }
      : lockAxis === 'x'
      ? () => {
          return isScreenReachDestination.x;
        }
      : () => {
          return isScreenReachDestination.y;
        };
    const computeFrame = () => {
      const progress = {
        x: computeProgress(startingTimestamp, distance.x, velocity.x),
        y: computeProgress(startingTimestamp, distance.y, velocity.y),
      };
      event.translationX =
        startingPosition.x - direction.x * distance.x * easing(progress.x);
      event.translationY =
        startingPosition.y - direction.y * distance.y * easing(progress.y);
      if (direction.x > 0) {
        if (event.translationX <= 0) {
          isScreenReachDestination.x = true;
          event.translationX = 0;
        }
      } else {
        if (event.translationX >= 0) {
          isScreenReachDestination.x = true;
          event.translationX = 0;
        }
      }
      if (direction.y > 0) {
        if (event.translationY <= 0) {
          isScreenReachDestination.y = true;
          event.translationY = 0;
        }
      } else {
        if (event.translationY >= 0) {
          isScreenReachDestination.y = true;
          event.translationY = 0;
        }
      }
      applyStyle(screenTransitionConfig, event);
      maybeScheduleNextFrame(
        computeFrame,
        isScreenReachDestinationCheck(),
        screenTransitionConfig
      );
    };
    return computeFrame;
  } else {
    const computeFrame = () => {
      const progress = {
        x: computeProgress(startingTimestamp, distance.x, velocity.x),
        y: computeProgress(startingTimestamp, distance.y, velocity.y),
      };
      event.translationX =
        startingPosition.x + direction.x * distance.x * easing(progress.x);
      event.translationY =
        startingPosition.y + direction.y * distance.y * easing(progress.y);
      if (direction.x > 0) {
        if (event.translationX >= screenSize.width) {
          isScreenReachDestination.x = true;
          event.translationX = screenSize.width;
        }
      } else {
        if (event.translationX <= -screenSize.width) {
          isScreenReachDestination.x = true;
          event.translationX = -screenSize.width;
        }
      }
      if (direction.y > 0) {
        if (event.translationY >= screenSize.height) {
          isScreenReachDestination.y = true;
          event.translationY = screenSize.height;
        }
      } else {
        if (event.translationY <= -screenSize.height) {
          isScreenReachDestination.y = true;
          event.translationY = -screenSize.height;
        }
      }
      applyStyle(screenTransitionConfig, event);
      maybeScheduleNextFrame(
        computeFrame,
        isScreenReachDestination.x || isScreenReachDestination.y,
        screenTransitionConfig
      );
    };
    return computeFrame;
  }
}
