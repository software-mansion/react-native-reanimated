import {
  type AnimationData,
  parseAnimationObjectToKeyframe,
} from '../animationParser';

const DEFAULT_ROLL_TIME = 0.3;

export const RollInData: Record<string, AnimationData> = {
  RollInLeft: {
    name: 'RollInLeft',
    style: {
      0: {
        transform: [{ translateX: '-100vw', rotate: '-180deg' }],
      },
    },
    duration: DEFAULT_ROLL_TIME,
  },

  RollInRight: {
    name: 'RollInRight',
    style: {
      0: {
        transform: [{ translateX: '100vw', rotate: '180deg' }],
      },
    },
    duration: DEFAULT_ROLL_TIME,
  },
};

export const RollOutData: Record<string, AnimationData> = {
  RollOutLeft: {
    name: 'RollOutLeft',
    style: {
      100: {
        transform: [{ translateX: '-100vw', rotate: '-180deg' }],
      },
    },
    duration: DEFAULT_ROLL_TIME,
  },

  RollOutRight: {
    name: 'RollOutRight',
    style: {
      100: {
        transform: [{ translateX: '100vw', rotate: '180deg' }],
      },
    },
    duration: DEFAULT_ROLL_TIME,
  },
};

export const RollIn = {
  RollInLeft: {
    style: parseAnimationObjectToKeyframe(RollInData.RollInLeft),
    duration: RollInData.RollInLeft.duration,
  },
  RollInRight: {
    style: parseAnimationObjectToKeyframe(RollInData.RollInRight),
    duration: RollInData.RollInRight.duration,
  },
};

export const RollOut = {
  RollOutLeft: {
    style: parseAnimationObjectToKeyframe(RollOutData.RollOutLeft),
    duration: RollOutData.RollOutLeft.duration,
  },
  RollOutRight: {
    style: parseAnimationObjectToKeyframe(RollOutData.RollOutRight),
    duration: RollOutData.RollOutRight.duration,
  },
};
