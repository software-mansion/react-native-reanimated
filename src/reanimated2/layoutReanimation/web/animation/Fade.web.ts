'use strict';
import { convertAnimationObjectToKeyframes } from '../animationParser';

const DEFAULT_FADE_TIME = 0.3;

export const FadeInData = {
  FadeIn: {
    name: 'FadeIn',
    style: { 0: { opacity: 0 } },
    duration: DEFAULT_FADE_TIME,
  },

  FadeInRight: {
    name: 'FadeInRight',
    style: {
      0: {
        opacity: 0,
        transform: [{ translateX: '25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },

  FadeInLeft: {
    name: 'FadeInLeft',
    style: {
      0: {
        opacity: 0,
        transform: [{ translateX: '-25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },

  FadeInUp: {
    name: 'FadeInUp',
    style: {
      0: {
        opacity: 0,
        transform: [{ translateY: '-25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },

  FadeInDown: {
    name: 'FadeInDown',
    style: {
      0: {
        opacity: 0,
        transform: [{ translateY: '25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },
};

export const FadeOutData = {
  FadeOut: {
    name: 'FadeOut',
    style: { 100: { opacity: 0 } },
    duration: DEFAULT_FADE_TIME,
  },

  FadeOutRight: {
    name: 'FadeOutRight',
    style: {
      100: {
        opacity: 0,
        transform: [{ translateX: '25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },

  FadeOutLeft: {
    name: 'FadeOutLeft',
    style: {
      100: {
        opacity: 0,
        transform: [{ translateX: '-25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },

  FadeOutUp: {
    name: 'FadeOutUp',
    style: {
      100: {
        opacity: 0,
        transform: [{ translateY: '-25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },

  FadeOutDown: {
    name: 'FadeOutDown',
    style: {
      100: {
        opacity: 0,
        transform: [{ translateY: '25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },
};

export const FadeIn = {
  FadeIn: {
    style: convertAnimationObjectToKeyframes(FadeInData.FadeIn),
    duration: FadeInData.FadeIn.duration,
  },
  FadeInRight: {
    style: convertAnimationObjectToKeyframes(FadeInData.FadeInRight),
    duration: FadeInData.FadeInRight.duration,
  },
  FadeInLeft: {
    style: convertAnimationObjectToKeyframes(FadeInData.FadeInLeft),
    duration: FadeInData.FadeInLeft.duration,
  },
  FadeInUp: {
    style: convertAnimationObjectToKeyframes(FadeInData.FadeInUp),
    duration: FadeInData.FadeInUp.duration,
  },
  FadeInDown: {
    style: convertAnimationObjectToKeyframes(FadeInData.FadeInDown),
    duration: FadeInData.FadeInDown.duration,
  },
};

export const FadeOut = {
  FadeOut: {
    style: convertAnimationObjectToKeyframes(FadeOutData.FadeOut),
    duration: FadeOutData.FadeOut.duration,
  },
  FadeOutRight: {
    style: convertAnimationObjectToKeyframes(FadeOutData.FadeOutRight),
    duration: FadeOutData.FadeOutRight.duration,
  },
  FadeOutLeft: {
    style: convertAnimationObjectToKeyframes(FadeOutData.FadeOutLeft),
    duration: FadeOutData.FadeOutLeft.duration,
  },
  FadeOutUp: {
    style: convertAnimationObjectToKeyframes(FadeOutData.FadeOutUp),
    duration: FadeOutData.FadeOutUp.duration,
  },
  FadeOutDown: {
    style: convertAnimationObjectToKeyframes(FadeOutData.FadeOutDown),
    duration: FadeOutData.FadeOutDown.duration,
  },
};
