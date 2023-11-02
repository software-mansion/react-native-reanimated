import type { ScreenTransitionConfig } from '../commonTypes';

const VELOCITY = 300;

export function computeProgress(startingTimestamp: number, distance: number) {
  'worklet';
  const elapsedTime = (_getAnimationTimestamp() - startingTimestamp) / 1000;
  const currentPosition = VELOCITY * elapsedTime;
  const progress = currentPosition / distance;
  return progress;
}

export function easing(x: number): number {
  'worklet';
  return 1 - Math.pow(1 - x, 5);
}

export function maybeScheduleNextFrame(
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
