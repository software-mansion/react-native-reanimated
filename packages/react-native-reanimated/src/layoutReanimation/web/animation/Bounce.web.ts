'use strict';
import { convertAnimationObjectToKeyframes } from '../animationParser';

const DEFAULT_BOUNCE_TIME = 0.6;

export const BounceInData = {
  BounceIn: {
    name: 'BounceIn',
    style: {
      0: { transform: [{ scale: 0 }] },
      55: { transform: [{ scale: 1.2 }] },
      70: { transform: [{ scale: 0.9 }] },
      85: { transform: [{ scale: 1.1 }] },
      100: { transform: [{ scale: 1 }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  BounceInRight: {
    name: 'BounceInRight',
    style: {
      0: { transform: [{ translateX: '100vw' }] },
      55: { transform: [{ translateX: '-20px' }] },
      70: { transform: [{ translateX: '10px' }] },
      85: { transform: [{ translateX: '-10px' }] },
      100: { transform: [{ translateX: '0px' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  BounceInLeft: {
    name: 'BounceInLeft',
    style: {
      0: { transform: [{ translateX: '-100vw' }] },
      55: { transform: [{ translateX: '20px' }] },
      70: { transform: [{ translateX: '-10px' }] },
      85: { transform: [{ translateX: '10px' }] },
      100: { transform: [{ translateX: '0px' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  BounceInUp: {
    name: 'BounceInUp',
    style: {
      0: { transform: [{ translateY: '-100vh' }] },
      55: { transform: [{ translateY: '20px' }] },
      70: { transform: [{ translateY: '-10px' }] },
      85: { transform: [{ translateY: '10px' }] },
      100: { transform: [{ translateY: '0px' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  BounceInDown: {
    name: 'BounceInDown',
    style: {
      0: { transform: [{ translateY: '100vh' }] },
      55: { transform: [{ translateY: '-20px' }] },
      70: { transform: [{ translateY: '10px' }] },
      85: { transform: [{ translateY: '-10px' }] },
      100: { transform: [{ translateY: '0px' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },
};

export const BounceOutData = {
  BounceOut: {
    name: 'BounceOut',
    style: {
      0: { transform: [{ scale: 1 }] },
      15: { transform: [{ scale: 1.1 }] },
      30: { transform: [{ scale: 0.9 }] },
      45: { transform: [{ scale: 1.2 }] },
      100: { transform: [{ scale: 0.1 }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  BounceOutRight: {
    name: 'BounceOutRight',
    style: {
      0: { transform: [{ translateX: '0px' }] },
      15: { transform: [{ translateX: '-10px' }] },
      30: { transform: [{ translateX: '10px' }] },
      45: { transform: [{ translateX: '-20px' }] },
      100: { transform: [{ translateX: '100vh' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  BounceOutLeft: {
    name: 'BounceOutLeft',
    style: {
      0: { transform: [{ translateX: '0px' }] },
      15: { transform: [{ translateX: '10px' }] },
      30: { transform: [{ translateX: '-10px' }] },
      45: { transform: [{ translateX: '20px' }] },
      100: { transform: [{ translateX: '-100vh' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  BounceOutUp: {
    name: 'BounceOutUp',
    style: {
      0: { transform: [{ translateY: '0px' }] },
      15: { transform: [{ translateY: '10px' }] },
      30: { transform: [{ translateY: '-10px' }] },
      45: { transform: [{ translateY: '20px' }] },
      100: { transform: [{ translateY: '-100vh' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  BounceOutDown: {
    name: 'BounceOutDown',
    style: {
      0: { transform: [{ translateY: '0px' }] },
      15: { transform: [{ translateY: '-10px' }] },
      30: { transform: [{ translateY: '10px' }] },
      45: { transform: [{ translateY: '-20px' }] },
      100: { transform: [{ translateY: '100vh' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },
};

export const BounceIn = {
  BounceIn: {
    style: convertAnimationObjectToKeyframes(BounceInData.BounceIn),
    duration: BounceInData.BounceIn.duration,
  },
  BounceInRight: {
    style: convertAnimationObjectToKeyframes(BounceInData.BounceInRight),
    duration: BounceInData.BounceInRight.duration,
  },
  BounceInLeft: {
    style: convertAnimationObjectToKeyframes(BounceInData.BounceInLeft),
    duration: BounceInData.BounceInLeft.duration,
  },
  BounceInUp: {
    style: convertAnimationObjectToKeyframes(BounceInData.BounceInUp),
    duration: BounceInData.BounceInUp.duration,
  },
  BounceInDown: {
    style: convertAnimationObjectToKeyframes(BounceInData.BounceInDown),
    duration: BounceInData.BounceInDown.duration,
  },
};

export const BounceOut = {
  BounceOut: {
    style: convertAnimationObjectToKeyframes(BounceOutData.BounceOut),
    duration: BounceOutData.BounceOut.duration,
  },
  BounceOutRight: {
    style: convertAnimationObjectToKeyframes(BounceOutData.BounceOutRight),
    duration: BounceOutData.BounceOutRight.duration,
  },
  BounceOutLeft: {
    style: convertAnimationObjectToKeyframes(BounceOutData.BounceOutLeft),
    duration: BounceOutData.BounceOutLeft.duration,
  },
  BounceOutUp: {
    style: convertAnimationObjectToKeyframes(BounceOutData.BounceOutUp),
    duration: BounceOutData.BounceOutUp.duration,
  },
  BounceOutDown: {
    style: convertAnimationObjectToKeyframes(BounceOutData.BounceOutDown),
    duration: BounceOutData.BounceOutDown.duration,
  },
};
