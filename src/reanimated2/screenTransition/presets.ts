'use strict';

import type { AnimatedScreenTransition } from './commonTypes';

const HorizontalTransition: AnimatedScreenTransition = {
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

const VerticalTransition: AnimatedScreenTransition = {
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
        { translateX: (event.translationY - screenSize.height) * 0.3 },
      ],
    };
  },
};

const TwoDimensionalTransition: AnimatedScreenTransition = {
  topScreenFrame: (_event) => {
    'worklet';
    return {
      // TODO
    };
    //   return {
    //     transform: [
    //       { translateX: event.translationX },
    //       { translateY: event.translationY },
    //     ],
    //   };
  },
  belowTopScreenFrame: (_event, _screenSize) => {
    'worklet';
    return {
      // TODO
    };
  },
};

const FadeTransition: AnimatedScreenTransition = {
  topScreenFrame: (_event) => {
    'worklet';
    return {
      // TODO
    };
    //   return {
    //     opacity: 1 - Math.abs(event.translationX / Dimensions.get('window').width),
    //   };
  },
  belowTopScreenFrame: (_event, _screenSize) => {
    'worklet';
    return {
      // TODO
    };
  },
};

export const ScreenTransition = {
  horizontal: HorizontalTransition,
  vertical: VerticalTransition,
  twoDimensional: TwoDimensionalTransition,
  fade: FadeTransition,
};
