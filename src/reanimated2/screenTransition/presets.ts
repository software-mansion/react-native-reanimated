'use strict';

import type { AnimatedScreenTransition } from './commonTypes';

const SwipeRight: AnimatedScreenTransition = {
  topScreenFrame: (event) => {
    'worklet';
    return {
      transform: [{ translateX: event.translationX }],
    };
  },
  belowTopScreenFrame: (event, screenSize) => {
    'worklet';
    return {
      transform: [
        { translateX: (event.translationX - screenSize.width) * 0.3 },
      ],
    };
  },
};

const SwipeLeft: AnimatedScreenTransition = {
  topScreenFrame: (event) => {
    'worklet';
    return {
      transform: [{ translateX: event.translationX }],
    };
  },
  belowTopScreenFrame: (event, screenSize) => {
    'worklet';
    return {
      transform: [
        { translateX: (event.translationX + screenSize.width) * 0.3 },
      ],
    };
  },
};

const SwipeDown: AnimatedScreenTransition = {
  topScreenFrame: (event) => {
    'worklet';
    return {
      transform: [{ translateY: event.translationY }],
    };
  },
  belowTopScreenFrame: (event, screenSize) => {
    'worklet';
    return {
      transform: [
        { translateY: (event.translationY - screenSize.height) * 0.3 },
      ],
    };
  },
};

const SwipeUp: AnimatedScreenTransition = {
  topScreenFrame: (event) => {
    'worklet';
    return {
      transform: [{ translateY: event.translationY }],
    };
  },
  belowTopScreenFrame: (event, screenSize) => {
    'worklet';
    return {
      transform: [
        { translateY: (event.translationY + screenSize.height) * 0.3 },
      ],
    };
  },
};

const TwoDimensional: AnimatedScreenTransition = {
  topScreenFrame: (event, screenSize) => {
    'worklet';
    return {
      transform: [
        { translateX: event.translationX },
        { translateY: event.translationY },
        { scale: Math.min(1, (screenSize.height - event.translationY) / screenSize.height) }
      ],
    };
  },
  belowTopScreenFrame: (_event, _screenSize) => {
    'worklet';
    return {};
  },
};

const SwipeRightFade: AnimatedScreenTransition = {
  topScreenFrame: (event, screenSize) => {
    'worklet';
    return {
      opacity: 1 - Math.abs(event.translationX / screenSize.width),
    };
  },
  belowTopScreenFrame: (_event, _screenSize) => {
    'worklet';
    return {};
  },
};

export const ScreenTransition = {
  // basics
  SwipeRight,
  SwipeLeft,
  SwipeDown,
  SwipeUp,

  // extends
  TwoDimensional,
  SwipeRightFade,
};
