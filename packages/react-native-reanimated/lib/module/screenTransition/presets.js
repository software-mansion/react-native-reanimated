'use strict';

const SwipeRight = {
  topScreenStyle: event => {
    'worklet';

    return {
      transform: [{
        translateX: event.translationX
      }]
    };
  },
  belowTopScreenStyle: (event, screenSize) => {
    'worklet';

    return {
      transform: [{
        translateX: (event.translationX - screenSize.width) * 0.3
      }]
    };
  }
};
const SwipeLeft = {
  topScreenStyle: event => {
    'worklet';

    return {
      transform: [{
        translateX: event.translationX
      }]
    };
  },
  belowTopScreenStyle: (event, screenSize) => {
    'worklet';

    return {
      transform: [{
        translateX: (event.translationX + screenSize.width) * 0.3
      }]
    };
  }
};
const SwipeDown = {
  topScreenStyle: event => {
    'worklet';

    return {
      transform: [{
        translateY: event.translationY
      }]
    };
  },
  belowTopScreenStyle: (event, screenSize) => {
    'worklet';

    return {
      transform: [{
        translateY: (event.translationY - screenSize.height) * 0.3
      }]
    };
  }
};
const SwipeUp = {
  topScreenStyle: event => {
    'worklet';

    return {
      transform: [{
        translateY: event.translationY
      }]
    };
  },
  belowTopScreenStyle: (event, screenSize) => {
    'worklet';

    return {
      transform: [{
        translateY: (event.translationY + screenSize.height) * 0.3
      }]
    };
  }
};
const TwoDimensional = {
  topScreenStyle: (event, _screenSize) => {
    'worklet';

    return {
      transform: [{
        translateX: event.translationX
      }, {
        translateY: event.translationY
      }]
    };
  },
  belowTopScreenStyle: (_event, _screenSize) => {
    'worklet';

    return {};
  }
};
const Horizontal = {
  topScreenStyle: (event, _screenSize) => {
    'worklet';

    return {
      transform: [{
        translateX: event.translationX
      }]
    };
  },
  belowTopScreenStyle: (_event, _screenSize) => {
    'worklet';

    return {};
  }
};
const Vertical = {
  topScreenStyle: (event, _screenSize) => {
    'worklet';

    return {
      transform: [{
        translateY: event.translationY
      }]
    };
  },
  belowTopScreenStyle: (_event, _screenSize) => {
    'worklet';

    return {};
  }
};
const SwipeRightFade = {
  topScreenStyle: (event, screenSize) => {
    'worklet';

    return {
      opacity: 1 - Math.abs(event.translationX / screenSize.width)
    };
  },
  belowTopScreenStyle: (_event, _screenSize) => {
    'worklet';

    return {};
  }
};
export const ScreenTransition = {
  SwipeRight,
  SwipeLeft,
  SwipeDown,
  SwipeUp,
  Horizontal,
  Vertical,
  TwoDimensional,
  SwipeRightFade
};
//# sourceMappingURL=presets.js.map