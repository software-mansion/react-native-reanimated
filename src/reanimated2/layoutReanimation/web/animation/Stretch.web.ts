'use strict';
import { convertAnimationObjectToKeyframes } from '../animationParser';

const DEFAULT_STRETCH_TIME = 0.3;

export const StretchInData = {
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

export const StretchOutData = {
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

export const StretchIn = {
  StretchInX: {
    style: convertAnimationObjectToKeyframes(StretchInData.StretchInX),
    duration: StretchInData.StretchInX.duration,
  },
  StretchInY: {
    style: convertAnimationObjectToKeyframes(StretchInData.StretchInY),
    duration: StretchInData.StretchInY.duration,
  },
};

export const StretchOut = {
  StretchOutX: {
    style: convertAnimationObjectToKeyframes(StretchOutData.StretchOutX),
    duration: StretchOutData.StretchOutX.duration,
  },
  StretchOutY: {
    style: convertAnimationObjectToKeyframes(StretchOutData.StretchOutY),
    duration: StretchOutData.StretchOutY.duration,
  },
};
