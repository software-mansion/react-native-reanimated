'use strict';
import { convertAnimationObjectToKeyframes } from '../animationParser';

const DEFAULT_LIGHTSPEED_TIME = 0.3;

export const LightSpeedInData = {
  LightSpeedInRight: {
    name: 'LightSpeedInRight',
    style: {
      0: {
        transform: [{ translateX: '100vw', skewX: '-45deg' }],
        opacity: 0,
      },
      70: { transform: [{ skewX: '10deg' }] },
      85: { transform: [{ skewX: '-5deg' }] },
      100: { transform: [{ skewX: '0deg' }] },
    },
    duration: DEFAULT_LIGHTSPEED_TIME,
  },

  LightSpeedInLeft: {
    name: 'LightSpeedInLeft',
    style: {
      0: {
        transform: [{ translateX: '-100vw', skewX: '45deg' }],
        opacity: 0,
      },
      70: { transform: [{ skewX: '-10deg' }] },
      85: { transform: [{ skewX: '5deg' }] },
      100: { transform: [{ skewX: '0deg' }] },
    },
    duration: DEFAULT_LIGHTSPEED_TIME,
  },
};

export const LightSpeedOutData = {
  LightSpeedOutRight: {
    name: 'LightSpeedOutRight',
    style: {
      100: {
        transform: [{ translateX: '100vw', skewX: '-45deg' }],
        opacity: 0,
      },
    },
    duration: DEFAULT_LIGHTSPEED_TIME,
  },

  LightSpeedOutLeft: {
    name: 'LightSpeedOutLeft',
    style: {
      100: {
        transform: [{ translateX: '-100vw', skew: '45deg' }],
        opacity: 0,
      },
    },
    duration: DEFAULT_LIGHTSPEED_TIME,
  },
};

export const LightSpeedIn = {
  LightSpeedInRight: {
    style: convertAnimationObjectToKeyframes(
      LightSpeedInData.LightSpeedInRight
    ),
    duration: LightSpeedInData.LightSpeedInRight.duration,
  },
  LightSpeedInLeft: {
    style: convertAnimationObjectToKeyframes(LightSpeedInData.LightSpeedInLeft),
    duration: LightSpeedInData.LightSpeedInLeft.duration,
  },
};

export const LightSpeedOut = {
  LightSpeedOutRight: {
    style: convertAnimationObjectToKeyframes(
      LightSpeedOutData.LightSpeedOutRight
    ),
    duration: LightSpeedOutData.LightSpeedOutRight.duration,
  },
  LightSpeedOutLeft: {
    style: convertAnimationObjectToKeyframes(
      LightSpeedOutData.LightSpeedOutLeft
    ),
    duration: LightSpeedOutData.LightSpeedOutLeft.duration,
  },
};
