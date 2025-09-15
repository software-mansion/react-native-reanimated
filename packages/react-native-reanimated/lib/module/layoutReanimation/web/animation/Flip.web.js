'use strict';

import { convertAnimationObjectToKeyframes } from '../animationParser';
const DEFAULT_FLIP_TIME = 0.3;
export const FlipInData = {
  FlipInYRight: {
    name: 'FlipInYRight',
    style: {
      0: {
        transform: [{
          perspective: '500px',
          rotateY: '90deg',
          translateX: '100%'
        }]
      },
      100: {
        transform: [{
          perspective: '500px',
          rotateY: '0deg',
          translateX: '0%'
        }]
      }
    },
    duration: DEFAULT_FLIP_TIME
  },
  FlipInYLeft: {
    name: 'FlipInYLeft',
    style: {
      0: {
        transform: [{
          perspective: '500px',
          rotateY: '-90deg',
          translateX: '-100%'
        }]
      },
      100: {
        transform: [{
          perspective: '500px',
          rotateY: '0deg',
          translateX: '0%'
        }]
      }
    },
    duration: DEFAULT_FLIP_TIME
  },
  FlipInXUp: {
    name: 'FlipInXUp',
    style: {
      0: {
        transform: [{
          perspective: '500px',
          rotateX: '90deg',
          translateY: '-100%'
        }]
      },
      100: {
        transform: [{
          perspective: '500px',
          rotateX: '0deg',
          translateY: '0%'
        }]
      }
    },
    duration: DEFAULT_FLIP_TIME
  },
  FlipInXDown: {
    name: 'FlipInXDown',
    style: {
      0: {
        transform: [{
          perspective: '500px',
          rotateX: '-90deg',
          translateY: '100%'
        }]
      },
      100: {
        transform: [{
          perspective: '500px',
          rotateX: '0deg',
          translateY: '0%'
        }]
      }
    },
    duration: DEFAULT_FLIP_TIME
  },
  FlipInEasyX: {
    name: 'FlipInEasyX',
    style: {
      0: {
        transform: [{
          perspective: '500px',
          rotateX: '90deg'
        }]
      },
      100: {
        transform: [{
          perspective: '500px',
          rotateX: '0deg'
        }]
      }
    },
    duration: DEFAULT_FLIP_TIME
  },
  FlipInEasyY: {
    name: 'FlipInEasyY',
    style: {
      0: {
        transform: [{
          perspective: '500px',
          rotateY: '90deg'
        }]
      },
      100: {
        transform: [{
          perspective: '500px',
          rotateY: '0deg'
        }]
      }
    },
    duration: DEFAULT_FLIP_TIME
  }
};
export const FlipOutData = {
  FlipOutYRight: {
    name: 'FlipOutYRight',
    style: {
      0: {
        transform: [{
          perspective: '500px',
          rotateY: '0deg',
          translateX: '0%'
        }]
      },
      100: {
        transform: [{
          perspective: '500px',
          rotateY: '90deg',
          translateX: '100%'
        }]
      }
    },
    duration: DEFAULT_FLIP_TIME
  },
  FlipOutYLeft: {
    name: 'FlipOutYLeft',
    style: {
      0: {
        transform: [{
          perspective: '500px',
          rotateY: '0deg',
          translateX: '0%'
        }]
      },
      100: {
        transform: [{
          perspective: '500px',
          rotateY: '-90deg',
          translateX: '-100%'
        }]
      }
    },
    duration: DEFAULT_FLIP_TIME
  },
  FlipOutXUp: {
    name: 'FlipOutXUp',
    style: {
      0: {
        transform: [{
          perspective: '500px',
          rotateX: '0deg',
          translateY: '0%'
        }]
      },
      100: {
        transform: [{
          perspective: '500px',
          rotateX: '90deg',
          translateY: '-100%'
        }]
      }
    },
    duration: DEFAULT_FLIP_TIME
  },
  FlipOutXDown: {
    name: 'FlipOutXDown',
    style: {
      0: {
        transform: [{
          perspective: '500px',
          rotateX: '0deg',
          translateY: '0%'
        }]
      },
      100: {
        transform: [{
          perspective: '500px',
          rotateX: '-90deg',
          translateY: '100%'
        }]
      }
    },
    duration: DEFAULT_FLIP_TIME
  },
  FlipOutEasyX: {
    name: 'FlipOutEasyX',
    style: {
      0: {
        transform: [{
          perspective: '500px',
          rotateX: '0deg'
        }]
      },
      100: {
        transform: [{
          perspective: '500px',
          rotateX: '90deg'
        }]
      }
    },
    duration: DEFAULT_FLIP_TIME
  },
  FlipOutEasyY: {
    name: 'FlipOutEasyY',
    style: {
      0: {
        transform: [{
          perspective: '500px',
          rotateY: '0deg'
        }]
      },
      100: {
        transform: [{
          perspective: '500px',
          rotateY: '90deg'
        }]
      }
    },
    duration: DEFAULT_FLIP_TIME
  }
};
export const FlipIn = {
  FlipInYRight: {
    style: convertAnimationObjectToKeyframes(FlipInData.FlipInYRight),
    duration: FlipInData.FlipInYRight.duration
  },
  FlipInYLeft: {
    style: convertAnimationObjectToKeyframes(FlipInData.FlipInYLeft),
    duration: FlipInData.FlipInYLeft.duration
  },
  FlipInXUp: {
    style: convertAnimationObjectToKeyframes(FlipInData.FlipInXUp),
    duration: FlipInData.FlipInXUp.duration
  },
  FlipInXDown: {
    style: convertAnimationObjectToKeyframes(FlipInData.FlipInXDown),
    duration: FlipInData.FlipInXDown.duration
  },
  FlipInEasyX: {
    style: convertAnimationObjectToKeyframes(FlipInData.FlipInEasyX),
    duration: FlipInData.FlipInEasyX.duration
  },
  FlipInEasyY: {
    style: convertAnimationObjectToKeyframes(FlipInData.FlipInEasyY),
    duration: FlipInData.FlipInEasyY.duration
  }
};
export const FlipOut = {
  FlipOutYRight: {
    style: convertAnimationObjectToKeyframes(FlipOutData.FlipOutYRight),
    duration: FlipOutData.FlipOutYRight.duration
  },
  FlipOutYLeft: {
    style: convertAnimationObjectToKeyframes(FlipOutData.FlipOutYLeft),
    duration: FlipOutData.FlipOutYLeft.duration
  },
  FlipOutXUp: {
    style: convertAnimationObjectToKeyframes(FlipOutData.FlipOutXUp),
    duration: FlipOutData.FlipOutXUp.duration
  },
  FlipOutXDown: {
    style: convertAnimationObjectToKeyframes(FlipOutData.FlipOutXDown),
    duration: FlipOutData.FlipOutXDown.duration
  },
  FlipOutEasyX: {
    style: convertAnimationObjectToKeyframes(FlipOutData.FlipOutEasyX),
    duration: FlipOutData.FlipOutEasyX.duration
  },
  FlipOutEasyY: {
    style: convertAnimationObjectToKeyframes(FlipOutData.FlipOutEasyY),
    duration: FlipOutData.FlipOutEasyY.duration
  }
};
//# sourceMappingURL=Flip.web.js.map