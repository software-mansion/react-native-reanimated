import { parseAnimationObjectToKeyframe } from '../webAnimations';
import { AnimationData } from '../webAnimationsData';

const DEFAULT_ROTATE_TIME = 0.3;

export const RotateInData: Record<string, AnimationData> = {
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
    },
    duration: DEFAULT_ROTATE_TIME,
  },
};

export const RotateOutData: Record<string, AnimationData> = {
  RotateOutDownLeft: {
    name: 'RotateOutDownLeft',
    style: {
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
    style: parseAnimationObjectToKeyframe(RotateInData.RotateInDownLeft),
    duration: RotateInData.RotateInDownLeft.duration,
  },
  RotateInDownRight: {
    style: parseAnimationObjectToKeyframe(RotateInData.RotateInDownRight),
    duration: RotateInData.RotateInDownRight.duration,
  },
  RotateInUpLeft: {
    style: parseAnimationObjectToKeyframe(RotateInData.RotateInUpLeft),
    duration: RotateInData.RotateInUpLeft.duration,
  },
  RotateInUpRight: {
    style: parseAnimationObjectToKeyframe(RotateInData.RotateInUpRight),
    duration: RotateInData.RotateInUpRight.duration,
  },
};

export const RotateOut = {
  RotateOutDownLeft: {
    style: parseAnimationObjectToKeyframe(RotateOutData.RotateOutDownLeft),
    duration: RotateOutData.RotateOutDownLeft.duration,
  },
  RotateOutDownRight: {
    style: parseAnimationObjectToKeyframe(RotateOutData.RotateOutDownRight),
    duration: RotateOutData.RotateOutDownRight.duration,
  },
  RotateOutUpLeft: {
    style: parseAnimationObjectToKeyframe(RotateOutData.RotateOutUpLeft),
    duration: RotateOutData.RotateOutUpLeft.duration,
  },
  RotateOutUpRight: {
    style: parseAnimationObjectToKeyframe(RotateOutData.RotateOutUpRight),
    duration: RotateOutData.RotateOutUpRight.duration,
  },
};
