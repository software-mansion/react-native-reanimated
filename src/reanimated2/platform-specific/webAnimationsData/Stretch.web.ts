import { AnimationData } from '../webAnimationsData';

const DEFAULT_STRETCH_TIME = 0.3;

export const StretchInData: Record<string, AnimationData> = {
  StretchInX: {
    name: 'StretchInX',
    style: {
      0: { transform: [{ scaleX: 0 }] },
      100: { transform: [{ scaleX: 1 }] },
    },
    duration: DEFAULT_STRETCH_TIME,
  },

  StretchInY: {
    name: 'StretchInY',
    style: {
      0: { transform: [{ scaleY: 0 }] },
      100: { transform: [{ scaleY: 1 }] },
    },
    duration: DEFAULT_STRETCH_TIME,
  },
};

export const StretchOutData: Record<string, AnimationData> = {
  StretchOutX: {
    name: 'StretchOutX',
    style: {
      0: { transform: [{ scaleX: 1 }] },
      100: { transform: [{ scaleX: 0 }] },
    },
    duration: DEFAULT_STRETCH_TIME,
  },

  StretchOutY: {
    name: 'StretchOutY',
    style: {
      0: { transform: [{ scaleY: 1 }] },
      100: { transform: [{ scaleY: 0 }] },
    },
    duration: DEFAULT_STRETCH_TIME,
  },
};
