'use strict';

import { convertAnimationObjectToKeyframes } from '../animationParser';
const DEFAULT_ROLL_TIME = 0.3;
export const RollInData = {
  RollInLeft: {
    name: 'RollInLeft',
    style: {
      0: {
        transform: [{
          translateX: '-100vw',
          rotate: '-180deg'
        }]
      },
      100: {
        transform: [{
          translateX: '0vw',
          rotate: '0deg'
        }]
      }
    },
    duration: DEFAULT_ROLL_TIME
  },
  RollInRight: {
    name: 'RollInRight',
    style: {
      0: {
        transform: [{
          translateX: '100vw',
          rotate: '180deg'
        }]
      },
      100: {
        transform: [{
          translateX: '0vw',
          rotate: '0deg'
        }]
      }
    },
    duration: DEFAULT_ROLL_TIME
  }
};
export const RollOutData = {
  RollOutLeft: {
    name: 'RollOutLeft',
    style: {
      0: {
        transform: [{
          translateX: '0vw',
          rotate: '0deg'
        }]
      },
      100: {
        transform: [{
          translateX: '-100vw',
          rotate: '-180deg'
        }]
      }
    },
    duration: DEFAULT_ROLL_TIME
  },
  RollOutRight: {
    name: 'RollOutRight',
    style: {
      0: {
        transform: [{
          translateX: '0vw',
          rotate: '0deg'
        }]
      },
      100: {
        transform: [{
          translateX: '100vw',
          rotate: '180deg'
        }]
      }
    },
    duration: DEFAULT_ROLL_TIME
  }
};
export const RollIn = {
  RollInLeft: {
    style: convertAnimationObjectToKeyframes(RollInData.RollInLeft),
    duration: RollInData.RollInLeft.duration
  },
  RollInRight: {
    style: convertAnimationObjectToKeyframes(RollInData.RollInRight),
    duration: RollInData.RollInRight.duration
  }
};
export const RollOut = {
  RollOutLeft: {
    style: convertAnimationObjectToKeyframes(RollOutData.RollOutLeft),
    duration: RollOutData.RollOutLeft.duration
  },
  RollOutRight: {
    style: convertAnimationObjectToKeyframes(RollOutData.RollOutRight),
    duration: RollOutData.RollOutRight.duration
  }
};
//# sourceMappingURL=Roll.web.js.map