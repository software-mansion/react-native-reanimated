'use strict';

import type { AnimatedScreenTransition } from './commonTypes';

const SwipeRight: AnimatedScreenTransition = {
  topScreenStyle: (event) => {
    'worklet';
    return {
      transform: [{ translateX: event.translationX }],
    };
  },
  belowTopScreenStyle: (event, screenSize) => {
    'worklet';
    return {
      transform: [
        { translateX: (event.translationX - screenSize.width) * 0.3 },
      ],
    };
  },
};

const SwipeLeft: AnimatedScreenTransition = {
  topScreenStyle: (event) => {
    'worklet';
    return {
      transform: [{ translateX: event.translationX }],
    };
  },
  belowTopScreenStyle: (event, screenSize) => {
    'worklet';
    return {
      transform: [
        { translateX: (event.translationX + screenSize.width) * 0.3 },
      ],
    };
  },
};

const SwipeDown: AnimatedScreenTransition = {
  topScreenStyle: (event) => {
    'worklet';
    return {
      transform: [{ translateY: event.translationY }],
    };
  },
  belowTopScreenStyle: (event, screenSize) => {
    'worklet';
    return {
      transform: [
        { translateY: (event.translationY - screenSize.height) * 0.3 },
      ],
    };
  },
};

const SwipeUp: AnimatedScreenTransition = {
  topScreenStyle: (event) => {
    'worklet';
    return {
      transform: [{ translateY: event.translationY }],
    };
  },
  belowTopScreenStyle: (event, screenSize) => {
    'worklet';
    return {
      transform: [
        { translateY: (event.translationY + screenSize.height) * 0.3 },
      ],
    };
  },
};

const TwoDimensional: AnimatedScreenTransition = {
  topScreenStyle: (event, _screenSize) => {
    'worklet';
    return {
      transform: [
        { translateX: event.translationX },
        { translateY: event.translationY },
      ],
    };
  },
  belowTopScreenStyle: (_event, _screenSize) => {
    'worklet';
    return {};
  },
};

const Horizontal: AnimatedScreenTransition = {
  topScreenStyle: (event, _screenSize) => {
    'worklet';
    return {
      transform: [{ translateX: event.translationX }],
    };
  },
  belowTopScreenStyle: (_event, _screenSize) => {
    'worklet';
    return {};
  },
};

const Vertical: AnimatedScreenTransition = {
  topScreenStyle: (event, _screenSize) => {
    'worklet';
    return {
      transform: [{ translateY: event.translationY }],
    };
  },
  belowTopScreenStyle: (_event, _screenSize) => {
    'worklet';
    return {};
  },
};

const SwipeRightFade: AnimatedScreenTransition = {
  topScreenStyle: (event, screenSize) => {
    'worklet';
    return {
      opacity: 1 - Math.abs(event.translationX / screenSize.width),
    };
  },
  belowTopScreenStyle: (_event, _screenSize) => {
    'worklet';
    return {};
  },
};

export const ScreenTransition = {
  SwipeRight,
  SwipeLeft,
  SwipeDown,
  SwipeUp,
  Horizontal,
  Vertical,
  TwoDimensional,
  SwipeRightFade,
};
