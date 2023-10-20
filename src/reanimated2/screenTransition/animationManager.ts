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

export function finishScreenTransition(
  screenTransitionConfig: ScreenTransitionConfig
) {
  'worklet';
  screenTransitionConfig.sharedEvent.removeListener(
    screenTransitionConfig.stackTag
  );
  const event = screenTransitionConfig.sharedEvent.value;
  const isTransitionCanceled = screenTransitionConfig.isTransitionCanceled;
  const goBackGesture = screenTransitionConfig.goBackGesture;
  const screenSize = screenTransitionConfig.screenDimensions;

  let step = () => {
    // noop
  };
  if (goBackGesture === 'swipeRight') {
    step = () => {
      let isScreenReachDestination = false;
      if (isTransitionCanceled) {
        event.translationX -= 400 * 0.016;
        if (event.translationX < 0) {
          isScreenReachDestination = true;
          event.translationX = 0;
        }
      } else {
        event.translationX += 400 * 0.016;
        if (event.translationX > screenSize.width) {
          isScreenReachDestination = true;
          event.translationX = screenSize.width;
        }
      }
      applyStyle(screenTransitionConfig, event);
      if (!isScreenReachDestination) {
        requestAnimationFrame(step);
      } else {
        if (screenTransitionConfig.onFinishAnimation) {
          screenTransitionConfig.onFinishAnimation();
        }
      }
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
      if (!isScreenReachDestination) {
        requestAnimationFrame(step);
      } else {
        if (screenTransitionConfig.onFinishAnimation) {
          screenTransitionConfig.onFinishAnimation();
        }
      }
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
      if (!isScreenReachDestination) {
        requestAnimationFrame(step);
      } else {
        if (screenTransitionConfig.onFinishAnimation) {
          screenTransitionConfig.onFinishAnimation();
        }
      }
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
      if (!isScreenReachDestination) {
        requestAnimationFrame(step);
      } else {
        if (screenTransitionConfig.onFinishAnimation) {
          screenTransitionConfig.onFinishAnimation();
        }
      }
    };
  }
  step();
}
