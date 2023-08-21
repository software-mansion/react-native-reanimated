import { AnimationData } from '../webAnimationsData';

const DEFAULT_FLIP_TIME = 0.3;

export const FlipInData: Record<string, AnimationData> = {
  FlipInYRight: {
    name: 'FlipInYRight',
    style: {
      0: {
        transform: [
          {
            perspective: '500px',
            rotateY: '90deg',
            translateX: '100%',
          },
        ],
      },
      100: {
        transform: [
          {
            perspective: '500px',
            rotateY: '0deg',
            translateX: '0%',
          },
        ],
      },
    },
    duration: DEFAULT_FLIP_TIME,
  },

  FlipInYLeft: {
    name: 'FlipInYLeft',
    style: {
      0: {
        transform: [
          {
            perspective: '500px',
            rotateY: '-90deg',
            translateX: '-100%',
          },
        ],
      },
      100: {
        transform: [
          {
            perspective: '500px',
            rotateY: '0deg',
            translateX: '0%',
          },
        ],
      },
    },
    duration: DEFAULT_FLIP_TIME,
  },

  FlipInXUp: {
    name: 'FlipInXUp',
    style: {
      0: {
        transform: [
          {
            perspective: '500px',
            rotateX: '90deg',
            translateY: '-100%',
          },
        ],
      },
      100: {
        transform: [
          {
            perspective: '500px',
            rotateX: '0deg',
            translateY: '0%',
          },
        ],
      },
    },
    duration: DEFAULT_FLIP_TIME,
  },

  FlipInXDown: {
    name: 'FlipInXDown',
    style: {
      0: {
        transform: [
          {
            perspective: '500px',
            rotateX: '-90deg',
            translateY: '100%',
          },
        ],
      },
      100: {
        transform: [
          {
            perspective: '500px',
            rotateX: '0deg',
            translateY: '0%',
          },
        ],
      },
    },
    duration: DEFAULT_FLIP_TIME,
  },

  FlipInEasyX: {
    name: 'FlipInEasyX',
    style: {
      0: { transform: [{ perspective: '500px', rotateX: '90deg' }] },
      100: { transform: [{ perspective: '500px', rotateX: '0deg' }] },
    },
    duration: DEFAULT_FLIP_TIME,
  },

  FlipInEasyY: {
    name: 'FlipInEasyY',
    style: {
      0: { transform: [{ perspective: '500px', rotateY: '90deg' }] },
      100: { transform: [{ perspective: '500px', rotateY: '0deg' }] },
    },
    duration: DEFAULT_FLIP_TIME,
  },
};

export const FlipOutData: Record<string, AnimationData> = {
  FlipOutYRight: {
    name: 'FlipOutYRight',
    style: {
      0: {
        transform: [
          {
            perspective: '500px',
            rotateY: '0deg',
            translateX: '0%',
          },
        ],
      },
      100: {
        transform: [
          {
            perspective: '500px',
            rotateY: '90deg',
            translateX: '100%',
          },
        ],
      },
    },
    duration: DEFAULT_FLIP_TIME,
  },

  FlipOutYLeft: {
    name: 'FlipOutYLeft',
    style: {
      0: {
        transform: [
          {
            perspective: '500px',
            rotateY: '0deg',
            translateX: '0%',
          },
        ],
      },
      100: {
        transform: [
          {
            perspective: '500px',
            rotateY: '-90deg',
            translateX: '-100%',
          },
        ],
      },
    },
    duration: DEFAULT_FLIP_TIME,
  },

  FlipOutXUp: {
    name: 'FlipOutXUp',
    style: {
      0: {
        transform: [
          {
            perspective: '500px',
            rotateX: '0deg',
            translateY: '0%',
          },
        ],
      },
      100: {
        transform: [
          {
            perspective: '500px',
            rotateX: '90deg',
            translateY: '-100%',
          },
        ],
      },
    },
    duration: DEFAULT_FLIP_TIME,
  },

  FlipOutXDown: {
    name: 'FlipOutXDown',
    style: {
      0: {
        transform: [
          {
            perspective: '500px',
            rotateX: '0deg',
            translateY: '0%',
          },
        ],
      },
      100: {
        transform: [
          {
            perspective: '500px',
            rotateX: '-90deg',
            translateY: '100%',
          },
        ],
      },
    },
    duration: DEFAULT_FLIP_TIME,
  },

  FlipOutEasyX: {
    name: 'FlipOutEasyX',
    style: {
      0: { transform: [{ perspective: '500px', rotateX: '0deg' }] },
      100: { transform: [{ perspective: '500px', rotateX: '90deg' }] },
    },
    duration: DEFAULT_FLIP_TIME,
  },

  FlipOutEasyY: {
    name: 'FlipOutEasyY',
    style: {
      0: { transform: [{ perspective: '500px', rotateY: '0deg' }] },
      100: { transform: [{ perspective: '500px', rotateY: '90deg' }] },
    },
    duration: DEFAULT_FLIP_TIME,
  },
};
