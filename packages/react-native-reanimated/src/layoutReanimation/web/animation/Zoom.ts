'use strict';
import { convertAnimationObjectToKeyframes } from '../animationParser';

const DEFAULT_ZOOM_TIME = 0.3;

export const ZoomInData = {
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

export const ZoomOutData = {
  ZoomOut: {
    name: 'ZoomOut',
    style: {
      0: { transform: [{ scale: 1 }] },
      100: { transform: [{ scale: 0 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomOutRotate: {
    name: 'ZoomOutRotate',
    style: {
      0: { transform: [{ scale: 1, rotate: '0rad' }] },
      100: { transform: [{ scale: 0, rotate: '0.3rad' }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomOutRight: {
    name: 'ZoomOutRight',
    style: {
      0: { transform: [{ translateX: '0vw', scale: 1 }] },
      100: { transform: [{ translateX: '100vw', scale: 0 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomOutLeft: {
    name: 'ZoomOutLeft',
    style: {
      0: { transform: [{ translateX: '0vw', scale: 1 }] },
      100: { transform: [{ translateX: '-100vw', scale: 0 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomOutUp: {
    name: 'ZoomOutUp',
    style: {
      0: { transform: [{ translateX: '0vh', scale: 1 }] },
      100: { transform: [{ translateY: '-100vh', scale: 0 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomOutDown: {
    name: 'ZoomOutDown',
    style: {
      0: { transform: [{ translateX: '0vh', scale: 1 }] },
      100: { transform: [{ translateY: '100vh', scale: 0 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomOutEasyUp: {
    name: 'ZoomOutEasyUp',
    style: {
      0: { transform: [{ translateY: '0%', scale: 1 }] },
      100: { transform: [{ translateY: '-100%', scale: 0 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },

  ZoomOutEasyDown: {
    name: 'ZoomOutEasyDown',
    style: {
      0: { transform: [{ translateY: '0%', scale: 1 }] },
      100: { transform: [{ translateY: '100%', scale: 0 }] },
    },
    duration: DEFAULT_ZOOM_TIME,
  },
};

export const ZoomIn = {
  ZoomIn: {
    style: convertAnimationObjectToKeyframes(ZoomInData.ZoomIn),
    duration: ZoomInData.ZoomIn.duration,
  },
  ZoomInRotate: {
    style: convertAnimationObjectToKeyframes(ZoomInData.ZoomInRotate),
    duration: ZoomInData.ZoomInRotate.duration,
  },
  ZoomInRight: {
    style: convertAnimationObjectToKeyframes(ZoomInData.ZoomInRight),
    duration: ZoomInData.ZoomInRight.duration,
  },
  ZoomInLeft: {
    style: convertAnimationObjectToKeyframes(ZoomInData.ZoomInLeft),
    duration: ZoomInData.ZoomInLeft.duration,
  },
  ZoomInUp: {
    style: convertAnimationObjectToKeyframes(ZoomInData.ZoomInUp),
    duration: ZoomInData.ZoomInUp.duration,
  },
  ZoomInDown: {
    style: convertAnimationObjectToKeyframes(ZoomInData.ZoomInDown),
    duration: ZoomInData.ZoomInDown.duration,
  },
  ZoomInEasyUp: {
    style: convertAnimationObjectToKeyframes(ZoomInData.ZoomInEasyUp),
    duration: ZoomInData.ZoomInEasyUp.duration,
  },
  ZoomInEasyDown: {
    style: convertAnimationObjectToKeyframes(ZoomInData.ZoomInEasyDown),
    duration: ZoomInData.ZoomInEasyDown.duration,
  },
};

export const ZoomOut = {
  ZoomOut: {
    style: convertAnimationObjectToKeyframes(ZoomOutData.ZoomOut),
    duration: ZoomOutData.ZoomOut.duration,
  },
  ZoomOutRotate: {
    style: convertAnimationObjectToKeyframes(ZoomOutData.ZoomOutRotate),
    duration: ZoomOutData.ZoomOutRotate.duration,
  },
  ZoomOutRight: {
    style: convertAnimationObjectToKeyframes(ZoomOutData.ZoomOutRight),
    duration: ZoomOutData.ZoomOutRight.duration,
  },
  ZoomOutLeft: {
    style: convertAnimationObjectToKeyframes(ZoomOutData.ZoomOutLeft),
    duration: ZoomOutData.ZoomOutLeft.duration,
  },
  ZoomOutUp: {
    style: convertAnimationObjectToKeyframes(ZoomOutData.ZoomOutUp),
    duration: ZoomOutData.ZoomOutUp.duration,
  },
  ZoomOutDown: {
    style: convertAnimationObjectToKeyframes(ZoomOutData.ZoomOutDown),
    duration: ZoomOutData.ZoomOutDown.duration,
  },
  ZoomOutEasyUp: {
    style: convertAnimationObjectToKeyframes(ZoomOutData.ZoomOutEasyUp),
    duration: ZoomOutData.ZoomOutEasyUp.duration,
  },
  ZoomOutEasyDown: {
    style: convertAnimationObjectToKeyframes(ZoomOutData.ZoomOutEasyDown),
    duration: ZoomOutData.ZoomOutEasyDown.duration,
  },
};
