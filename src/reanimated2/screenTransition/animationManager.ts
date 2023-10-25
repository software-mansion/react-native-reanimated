'use strict';

import updateProps from '../UpdateProps';
import type { MeasuredDimensions, SharedValue } from '../commonTypes';
import type {
  AnimatedScreenTransition,
  PanGestureHandlerEventPayload,
} from './commonTypes';
import { configureProps } from '../../ConfigHelper';

configureProps();

type GoBackGesture = 'swipeRight' | 'swipeLeft' | 'swipeUp' | 'swipeDown';
type ScreenTransitionConfig = {
  stackTag: number;
  belowTopScreenTag: number;
  topScreenTag: number;
  screenTransition: AnimatedScreenTransition;
  isSwipeGesture: boolean;
  sharedEvent: SharedValue<PanGestureHandlerEventPayload>;
  startingGesturePosition: SharedValue<PanGestureHandlerEventPayload>;
  onFinishAnimation?: () => void;
  isTransitionCanceled: boolean;
  goBackGesture: GoBackGesture;
  screenDimensions: MeasuredDimensions;
};

function applyStyle(
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

export function startScreenTransition(
  screenTransitionConfig: ScreenTransitionConfig
) {
  'worklet';
  const sharedEvent = screenTransitionConfig.sharedEvent;
  sharedEvent.addListener(screenTransitionConfig.stackTag, () => {
    'worklet';
    applyStyle(screenTransitionConfig, sharedEvent.value);
  });
}

function easing(x: number): number {
  'worklet';
  return 1 - Math.pow(1 - x, 5);
}

const VELOCITY = 300;

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

function computeProgress(startingTimestamp: number, distance: number) {
  'worklet';
  const elapsedTime = (_getAnimationTimestamp() - startingTimestamp) / 1000;
  const currentPosition = VELOCITY * elapsedTime;
  const progress = currentPosition / distance;
  return progress;
}

export function finishScreenTransition(
  screenTransitionConfig: ScreenTransitionConfig
) {
  'worklet';
  screenTransitionConfig.sharedEvent.removeListener(
    screenTransitionConfig.stackTag
  );
  const event = {...screenTransitionConfig.sharedEvent.value};
  const isTransitionCanceled = screenTransitionConfig.isTransitionCanceled;
  const goBackGesture = screenTransitionConfig.goBackGesture;
  const screenSize = screenTransitionConfig.screenDimensions;

  let step = () => {
    // noop
  };
  // console.log(event, _getAnimationTimestamp(), event.translationX);
  let startingTimestamp = _getAnimationTimestamp();
  if (goBackGesture === 'swipeRight') {
    const startingPosition = event.translationX;
    const finalPosition = isTransitionCanceled ? 0 : screenSize.width;
    const distance = Math.abs(finalPosition - startingPosition);
    step = () => {
      const progress = computeProgress(startingTimestamp, distance);
      let isScreenReachDestination = false;
      if (isTransitionCanceled) {
        event.translationX = startingPosition - distance * easing(progress);
        if (event.translationX <= 0) {
          isScreenReachDestination = true;
          event.translationX = 0;
        }
      } else {
        event.translationX = startingPosition + distance * easing(progress);
        if (event.translationX >= screenSize.width) {
          isScreenReachDestination = true;
          event.translationX = screenSize.width;
        }
      }
      applyStyle(screenTransitionConfig, event);
      maybeScheduleNextFrame(step, isScreenReachDestination, screenTransitionConfig);
    };
  }

  if (goBackGesture === 'swipeLeft') {
    step = () => {
      let isScreenReachDestination = false;
      if (isTransitionCanceled) {
        event.translationX += 400 * 0.016;
        if (event.translationX > 0) {
          isScreenReachDestination = true;
          event.translationX = 0;
        }
      } else {
        event.translationX -= 400 * 0.016;
        if (event.translationX < -screenSize.width) {
          isScreenReachDestination = true;
          event.translationX = -screenSize.width;
        }
      }
      applyStyle(screenTransitionConfig, event);
      maybeScheduleNextFrame(step, isScreenReachDestination, screenTransitionConfig);
    };
  }

  if (goBackGesture === 'swipeUp') {
    step = () => {
      let isScreenReachDestination = false;
      if (isTransitionCanceled) {
        event.translationY += 400 * 0.016;
        if (event.translationY > 0) {
          isScreenReachDestination = true;
          event.translationY = 0;
        }
      } else {
        event.translationY -= 400 * 0.016;
        if (event.translationY < -screenSize.height) {
          isScreenReachDestination = true;
          event.translationY = -screenSize.height;
        }
      }
      applyStyle(screenTransitionConfig, event);
      maybeScheduleNextFrame(step, isScreenReachDestination, screenTransitionConfig);
    };
  }

  if (goBackGesture === 'swipeDown') {
    step = () => {
      let isScreenReachDestination = false;
      if (isTransitionCanceled) {
        event.translationY -= 400 * 0.016;
        if (event.translationY < 0) {
          isScreenReachDestination = true;
          event.translationY = 0;
        }
      } else {
        event.translationY += 400 * 0.016;
        if (event.translationY > screenSize.height) {
          isScreenReachDestination = true;
          event.translationY = screenSize.height;
        }
      }
      applyStyle(screenTransitionConfig, event);
      maybeScheduleNextFrame(step, isScreenReachDestination, screenTransitionConfig);
    };
  }
  step();
}
