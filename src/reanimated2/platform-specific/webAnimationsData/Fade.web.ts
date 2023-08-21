import {
  type AnimationData,
  parseAnimationObjectToKeyframe,
} from '../animationParser';

const DEFAULT_FADE_TIME = 0.3;

export const FadeInData: Record<string, AnimationData> = {
  FadeIn: {
    name: 'FadeIn',
    style: {
      0: { opacity: 0 },
      100: { opacity: 1 },
    },
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

export const FadeOutData: Record<string, AnimationData> = {
  FadeOut: {
    name: 'FadeOut',
    style: {
      0: { opacity: 1 },
      100: { opacity: 0 },
    },
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
    style: parseAnimationObjectToKeyframe(FadeInData.FadeIn),
    duration: FadeInData.FadeIn.duration,
  },
  FadeInRight: {
    style: parseAnimationObjectToKeyframe(FadeInData.FadeInRight),
    duration: FadeInData.FadeInRight.duration,
  },
  FadeInLeft: {
    style: parseAnimationObjectToKeyframe(FadeInData.FadeInLeft),
    duration: FadeInData.FadeInLeft.duration,
  },
  FadeInUp: {
    style: parseAnimationObjectToKeyframe(FadeInData.FadeInUp),
    duration: FadeInData.FadeInUp.duration,
  },
  FadeInDown: {
    style: parseAnimationObjectToKeyframe(FadeInData.FadeInDown),
    duration: FadeInData.FadeInDown.duration,
  },
};

export const FadeOut = {
  FadeOut: {
    style: parseAnimationObjectToKeyframe(FadeOutData.FadeOut),
    duration: FadeOutData.FadeOut.duration,
  },
  FadeOutRight: {
    style: parseAnimationObjectToKeyframe(FadeOutData.FadeOutRight),
    duration: FadeOutData.FadeOutRight.duration,
  },
  FadeOutLeft: {
    style: parseAnimationObjectToKeyframe(FadeOutData.FadeOutLeft),
    duration: FadeOutData.FadeOutLeft.duration,
  },
  FadeOutUp: {
    style: parseAnimationObjectToKeyframe(FadeOutData.FadeOutUp),
    duration: FadeOutData.FadeOutUp.duration,
  },
  FadeOutDown: {
    style: parseAnimationObjectToKeyframe(FadeOutData.FadeOutDown),
    duration: FadeOutData.FadeOutDown.duration,
  },
};
