import { AnimationData } from '../webAnimationsData';

const DEFAULT_ZOOM_TIME = 0.3;

export const ZoomInData: Record<string, AnimationData> = {
  ZoomIn: {
    name: 'ZoomIn',
    style: {
      0: { transform: [{ scale: 0 }] },
      100: { transform: [{ scale: 1 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomInRotate: {
    name: 'ZoomInRotate',
    style: {
      0: { transform: [{ scale: 0, rotate: '0.3rad' }] },
      100: { transform: [{ scale: 1, rotate: '0deg' }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomInRight: {
    name: 'ZoomInRight',
    style: {
      0: { transform: [{ translateX: '100vw', scale: 0 }] },
      100: { transform: [{ translateX: '0%', scale: 1 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomInLeft: {
    name: 'ZoomInLeft',
    style: {
      0: { transform: [{ translateX: '-100vw', scale: 0 }] },
      100: { transform: [{ translateX: '0%', scale: 1 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomInUp: {
    name: 'ZoomInUp',
    style: {
      0: { transform: [{ translateY: '-100vh', scale: 0 }] },
      100: { transform: [{ translateY: '0%', scale: 1 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomInDown: {
    name: 'ZoomInDown',
    style: {
      0: { transform: [{ translateY: '100vh', scale: 0 }] },
      100: { transform: [{ translateY: '0%', scale: 1 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomInEasyUp: {
    name: 'ZoomInEasyUp',
    style: {
      0: { transform: [{ translateY: '-100%', scale: 0 }] },
      100: { transform: [{ translateY: '0%', scale: 1 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomInEasyDown: {
    name: 'ZoomInEasyDown',
    style: {
      0: { transform: [{ translateY: '100%', scale: 0 }] },
      100: { transform: [{ translateY: '0%', scale: 1 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },
};

export const ZoomOutData: Record<string, AnimationData> = {
  ZoomOut: {
    name: 'ZoomOut',
    style: {
      100: { transform: [{ scale: 0 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomOutRotate: {
    name: 'ZoomOutRotate',
    style: {
      100: { transform: [{ scale: 0, rotate: '0.3rad' }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomOutRight: {
    name: 'ZoomOutRight',
    style: {
      100: { transform: [{ translateX: '100vw', scale: 0 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomOutLeft: {
    name: 'ZoomOutLeft',
    style: {
      100: { transform: [{ translateX: '-100vw', scale: 1 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomOutUp: {
    name: 'ZoomOutUp',
    style: {
      100: { transform: [{ translateY: '-100vh', scale: 0 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomOutDown: {
    name: 'ZoomOutDown',
    style: {
      100: { transform: [{ translateY: '100vh', scale: 0 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomOutEasyUp: {
    name: 'ZoomOutEasyUp',
    style: {
      100: { transform: [{ translateY: '-100%', scale: 0 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomOutEasyDown: {
    name: 'ZoomOutEasyDown',
    style: {
      100: { transform: [{ translateY: '100%', scale: 0 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },
};
