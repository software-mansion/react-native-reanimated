import { AnimationData } from '../webAnimationsData';

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
