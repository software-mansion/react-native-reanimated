import { AnimationData } from '../webAnimationsData';

const DEFAULT_SLIDE_TIME = 0.3;

export const SlideInData: Record<string, AnimationData> = {
  SlideInRight: {
    name: 'SlideInRight',
    style: {
      0: { transform: [{ translateX: '100vw' }] },
      100: { transform: [{ translateX: '0%' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },

  SlideInLeft: {
    name: 'SlideInLeft',
    style: {
      0: { transform: [{ translateX: '-100vw' }] },
      100: { transform: [{ translateX: '0%' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },

  SlideInUp: {
    name: 'SlideInUp',
    style: {
      0: { transform: [{ translateY: '-100vh' }] },
      100: { transform: [{ translateY: '0%' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },

  SlideInDown: {
    name: 'SlideInDown',
    style: {
      0: { transform: [{ translateY: '100vh' }] },
      100: { transform: [{ translateY: '0%' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },
};

export const SlideOutData: Record<string, AnimationData> = {
  SlideOutRight: {
    name: 'SlideOutRight',
    style: {
      0: { transform: [{ translateX: '0%' }] },
      100: { transform: [{ translateX: '100vw' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },

  SlideOutLeft: {
    name: 'SlideOutLeft',
    style: {
      0: { transform: [{ translateX: '0%' }] },
      100: { transform: [{ translateX: '-100vw' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },

  SlideOutUp: {
    name: 'SlideOutUp',
    style: {
      0: { transform: [{ translateY: '0%' }] },
      100: { transform: [{ translateY: '-100vh' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },

  SlideOutDown: {
    name: 'SlideOutDown',
    style: {
      0: { transform: [{ translateY: '0%' }] },
      100: { transform: [{ translateY: '100vh' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },
};
