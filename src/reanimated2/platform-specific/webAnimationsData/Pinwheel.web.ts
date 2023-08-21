import {
  type AnimationData,
  parseAnimationObjectToKeyframe,
} from '../animationParser';

const DEFAULT_PINWHEEL_TIME = 0.3;

export const PinwheelData: Record<string, AnimationData> = {
  PinwheelIn: {
    name: 'PinwheelIn',
    style: {
      0: {
        transform: [{ rotate: '5rad', scale: 0 }],
        opacity: 0,
      },

      100: {
        transform: [{ rotate: '0deg', scale: 1 }],
        opacity: 1,
      },
    },
    duration: DEFAULT_PINWHEEL_TIME,
  },

  PinwheelOut: {
    name: 'PinwheelOut',
    style: {
      100: {
        transform: [{ rotate: '5rad', scale: 0 }],
        opacity: 0,
      },
    },
    duration: DEFAULT_PINWHEEL_TIME,
  },
};

export const Pinwheel = {
  PinwheelIn: {
    style: parseAnimationObjectToKeyframe(PinwheelData.PinwheelIn),
    duration: PinwheelData.PinwheelIn.duration,
  },
  PinwheelOut: {
    style: parseAnimationObjectToKeyframe(PinwheelData.PinwheelOut),
    duration: PinwheelData.PinwheelOut.duration,
  },
};
