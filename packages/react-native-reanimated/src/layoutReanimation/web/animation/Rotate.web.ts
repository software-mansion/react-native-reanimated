'use strict';
import { convertAnimationObjectToKeyframes } from '../animationParser';

const DEFAULT_ROTATE_TIME = 0.3;

export const RotateInData = {
  RotateInDownLeft: {
    name: 'RotateInDownLeft',
    style: {
      0: {
        transform: [
          {
            translateX: '-50%',
            translateY: '-250%',
            rotate: '-90deg',
          },
        ],
        opacity: 0,
      },
      100: {
        transform: [
          {
            translateX: '0%',
            translateY: '0%',
            rotate: '0deg',
          },
        ],
        opacity: 1,
      },
    },
    duration: DEFAULT_ROTATE_TIME,
  },

  RotateInDownRight: {
    name: 'RotateInDownRight',
    style: {
      0: {
        transform: [
          {
            translateX: '40%',
            translateY: '-250%',
            rotate: '90deg',
          },
        ],
        opacity: 0,
      },
      100: {
        transform: [
          {
            translateX: '0%',
            translateY: '0%',
            rotate: '0deg',
          },
        ],
        opacity: 1,
      },
    },
    duration: DEFAULT_ROTATE_TIME,
  },

  RotateInUpLeft: {
    name: 'RotateInUpLeft',
    style: {
      0: {
        transform: [
          {
            translateX: '-40%',
            translateY: '250%',
            rotate: '90deg',
          },
        ],
        opacity: 0,
      },
      100: {
        transform: [
          {
            translateX: '0%',
            translateY: '0%',
            rotate: '0deg',
          },
        ],
        opacity: 1,
      },
    },
    duration: DEFAULT_ROTATE_TIME,
  },

  RotateInUpRight: {
    name: 'RotateInUpRight',
    style: {
      0: {
        transform: [
          {
            translateX: '40%',
            translateY: '250%',
            rotate: '-90deg',
          },
        ],
        opacity: 0,
      },
      100: {
        transform: [
          {
            translateX: '0%',
            translateY: '0%',
            rotate: '0deg',
          },
        ],
        opacity: 1,
      },
    },
    duration: DEFAULT_ROTATE_TIME,
  },
};

export const RotateOutData = {
  RotateOutDownLeft: {
    name: 'RotateOutDownLeft',
    style: {
      0: {
        transform: [
          {
            translateX: '0%',
            translateY: '0%',
            rotate: '0deg',
          },
        ],
        opacity: 1,
      },
      100: {
        transform: [
          {
            translateX: '-40%',
            translateY: '250%',
            rotate: '90deg',
          },
        ],
        opacity: 0,
      },
    },
    duration: DEFAULT_ROTATE_TIME,
  },

  RotateOutDownRight: {
    name: 'RotateOutDownRight',
    style: {
      0: {
        transform: [
          {
            translateX: '0%',
            translateY: '0%',
            rotate: '0deg',
          },
        ],
        opacity: 1,
      },
      100: {
        transform: [
          {
            translateX: '40%',
            translateY: '250%',
            rotate: '-90deg',
          },
        ],
        opacity: 0,
      },
    },
    duration: DEFAULT_ROTATE_TIME,
  },

  RotateOutUpLeft: {
    name: 'RotateOutUpLeft',
    style: {
      0: {
        transform: [
          {
            translateX: '0%',
            translateY: '0%',
            rotate: '0deg',
          },
        ],
        opacity: 1,
      },
      100: {
        transform: [
          {
            translateX: '-40%',
            translateY: '-250%',
            rotate: '-90deg',
          },
        ],
        opacity: 0,
      },
    },
    duration: DEFAULT_ROTATE_TIME,
  },

  RotateOutUpRight: {
    name: 'RotateOutUpRight',
    style: {
      0: {
        transform: [
          {
            translateX: '0%',
            translateY: '0%',
            rotate: '0deg',
          },
        ],
        opacity: 1,
      },
      100: {
        transform: [
          {
            translateX: '40%',
            translateY: '-250%',
            rotate: '90deg',
          },
        ],
        opacity: 0,
      },
    },
    duration: DEFAULT_ROTATE_TIME,
  },
};

export const RotateIn = {
  RotateInDownLeft: {
    style: convertAnimationObjectToKeyframes(RotateInData.RotateInDownLeft),
    duration: RotateInData.RotateInDownLeft.duration,
  },
  RotateInDownRight: {
    style: convertAnimationObjectToKeyframes(RotateInData.RotateInDownRight),
    duration: RotateInData.RotateInDownRight.duration,
  },
  RotateInUpLeft: {
    style: convertAnimationObjectToKeyframes(RotateInData.RotateInUpLeft),
    duration: RotateInData.RotateInUpLeft.duration,
  },
  RotateInUpRight: {
    style: convertAnimationObjectToKeyframes(RotateInData.RotateInUpRight),
    duration: RotateInData.RotateInUpRight.duration,
  },
};

export const RotateOut = {
  RotateOutDownLeft: {
    style: convertAnimationObjectToKeyframes(RotateOutData.RotateOutDownLeft),
    duration: RotateOutData.RotateOutDownLeft.duration,
  },
  RotateOutDownRight: {
    style: convertAnimationObjectToKeyframes(RotateOutData.RotateOutDownRight),
    duration: RotateOutData.RotateOutDownRight.duration,
  },
  RotateOutUpLeft: {
    style: convertAnimationObjectToKeyframes(RotateOutData.RotateOutUpLeft),
    duration: RotateOutData.RotateOutUpLeft.duration,
  },
  RotateOutUpRight: {
    style: convertAnimationObjectToKeyframes(RotateOutData.RotateOutUpRight),
    duration: RotateOutData.RotateOutUpRight.duration,
  },
};
