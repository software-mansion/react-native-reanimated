export interface TransformProperties {
  translateX?: string;
  translateY?: string;
  rotate?: string;
  rotateX?: string;
  rotateY?: string;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  perspective?: string;
  skew?: string;
  skewX?: string;
}

export interface AnimationStyle {
  opacity?: number;
  transform?: TransformProperties[];
}
export interface AnimationData {
  name: string;
  style: Record<number, AnimationStyle>;
  duration: number;
}

const DEFAULT_FADE_TIME = 0.3;
const DEFAULT_BOUNCE_TIME = 0.6;
const DEFAULT_FLIP_TIME = 0.3;
const DEFAULT_STRETCH_TIME = 0.3;
const DEFAULT_ZOOM_TIME = 0.3;
const DEFAULT_SLIDE_TIME = 0.3;
const DEFAULT_LIGHTSPEED_TIME = 0.3;
const DEFAULT_PINWHEEL_TIME = 0.3;
const DEFAULT_ROTATE_TIME = 0.3;
const DEFAULT_ROLL_TIME = 0.3;

// TODO: rewrite to px instead of %
export const AnimationsData: Record<string, AnimationData> = {
  // ====================================================================================
  // Fade In
  // ====================================================================================
  FadeIn: {
    name: 'FadeIn',
    style: {
      0: { opacity: 0 },
      100: { opacity: 1 },
    },
    duration: DEFAULT_FADE_TIME,
  },

  FadeInRight: {
    name: 'FadeInRight',
    style: {
      0: {
        opacity: 0,
        transform: [{ translateX: '25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },

  FadeInLeft: {
    name: 'FadeInLeft',
    style: {
      0: {
        opacity: 0,
        transform: [{ translateX: '-25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },

  FadeInUp: {
    name: 'FadeInUp',
    style: {
      0: {
        opacity: 0,
        transform: [{ translateY: '-25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },

  FadeInDown: {
    name: 'FadeInDown',
    style: {
      0: {
        opacity: 0,
        transform: [{ translateY: '25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },

  // ====================================================================================
  // Fade Out
  // ====================================================================================

  FadeOut: {
    name: 'FadeOut',
    style: {
      0: { opacity: 1 },
      100: { opacity: 0 },
    },
    duration: DEFAULT_FADE_TIME,
  },

  FadeOutRight: {
    name: 'FadeOutRight',
    style: {
      100: {
        opacity: 0,
        transform: [{ translateX: '25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },

  FadeOutLeft: {
    name: 'FadeOutLeft',
    style: {
      100: {
        opacity: 0,
        transform: [{ translateX: '-25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },

  FadeOutUp: {
    name: 'FadeOutUp',
    style: {
      100: {
        opacity: 0,
        transform: [{ translateY: '-25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },

  FadeOutDown: {
    name: 'FadeOutDown',
    style: {
      100: {
        opacity: 0,
        transform: [{ translateY: '25px' }],
      },
    },
    duration: DEFAULT_FADE_TIME,
  },

  // ====================================================================================
  // Bounce In
  // ====================================================================================

  BounceIn: {
    name: 'BounceIn',
    style: {
      0: { transform: [{ scale: 0 }] },
      55: { transform: [{ scale: 1.2 }] },
      70: { transform: [{ scale: 0.9 }] },
      85: { transform: [{ scale: 1.1 }] },
      100: { transform: [{ scale: 1 }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  BounceInRight: {
    name: 'BounceInRight',
    style: {
      0: { transform: [{ translateX: '100vw' }] },
      55: { transform: [{ translateX: '-20px' }] },
      70: { transform: [{ translateX: '10px' }] },
      85: { transform: [{ translateX: '-10px' }] },
      100: { transform: [{ translateX: '0px' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },
  BounceInLeft: {
    name: 'BounceInLeft',
    style: {
      0: { transform: [{ translateX: '-100vw' }] },
      55: { transform: [{ translateX: '20px' }] },
      70: { transform: [{ translateX: '-10px' }] },
      85: { transform: [{ translateX: '10px' }] },
      100: { transform: [{ translateX: '0px' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },
  BounceInUp: {
    name: 'BounceInUp',
    style: {
      0: { transform: [{ translateY: '-100vh' }] },
      55: { transform: [{ translateY: '20px' }] },
      70: { transform: [{ translateY: '-10px' }] },
      85: { transform: [{ translateY: '10px' }] },
      100: { transform: [{ translateY: '0px' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },
  BounceInDown: {
    name: 'BounceInDown',
    style: {
      0: { transform: [{ translateY: '100vh' }] },
      55: { transform: [{ translateY: '-20px' }] },
      70: { transform: [{ translateY: '10px' }] },
      85: { transform: [{ translateY: '-10px' }] },
      100: { transform: [{ translateY: '0px' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  // ====================================================================================
  // Bounce Out
  // ====================================================================================

  BounceOut: {
    name: 'BounceOut',
    style: {
      15: { transform: [{ scale: 1.1 }] },
      30: { transform: [{ scale: 0.9 }] },
      45: { transform: [{ scale: 1.2 }] },
      100: { transform: [{ scale: 0.1 }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  BounceOutRight: {
    name: 'BounceOutRight',
    style: {
      15: { transform: [{ translateX: '-10px' }] },
      30: { transform: [{ translateX: '10px' }] },
      45: { transform: [{ translateX: '-20px' }] },
      100: { transform: [{ translateX: '100vh' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  BounceOutLeft: {
    name: 'BounceOutLeft',
    style: {
      15: { transform: [{ translateX: '10px' }] },
      30: { transform: [{ translateX: '-10px' }] },
      45: { transform: [{ translateX: '20px' }] },
      100: { transform: [{ translateX: '-100vh' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  BounceOutUp: {
    name: 'BounceOutUp',
    style: {
      15: { transform: [{ translateY: '10px' }] },
      30: { transform: [{ translateY: '-10px' }] },
      45: { transform: [{ translateY: '20px' }] },
      100: { transform: [{ translateY: '-100vh' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  BounceOutDown: {
    name: 'BounceOutDown',
    style: {
      15: { transform: [{ translateY: '-10px' }] },
      30: { transform: [{ translateY: '10px' }] },
      45: { transform: [{ translateY: '-20px' }] },
      100: { transform: [{ translateY: '100vh' }] },
    },
    duration: DEFAULT_BOUNCE_TIME,
  },

  // ====================================================================================
  // Flip In
  // ====================================================================================

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

  // ====================================================================================
  // Flip Out
  // ====================================================================================

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

  // ====================================================================================
  // Stretch In
  // ====================================================================================

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

  // ====================================================================================
  // Stretch Out
  // ====================================================================================

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

  // ====================================================================================
  // Zoom In
  // ====================================================================================

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

  // ====================================================================================
  // Zoom Out
  // ====================================================================================

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

  // ====================================================================================
  // Slide In
  // ====================================================================================

  SlideInRight: {
    name: 'SlideInRight',
    style: {
      0: { transform: [{ translateX: '100vw' }] },
      100: { transform: [{ translateX: '0%' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },

  SlideInLeft: {
    name: 'SlideInLeft',
    style: {
      0: { transform: [{ translateX: '-100vw' }] },
      100: { transform: [{ translateX: '0%' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },

  SlideInUp: {
    name: 'SlideInUp',
    style: {
      0: { transform: [{ translateY: '-100vh' }] },
      100: { transform: [{ translateY: '0%' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },

  SlideInDown: {
    name: 'SlideInDown',
    style: {
      0: { transform: [{ translateY: '100vh' }] },
      100: { transform: [{ translateY: '0%' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },

  // ====================================================================================
  // Slide Out
  // ====================================================================================

  SlideOutRight: {
    name: 'SlideOutRight',
    style: {
      0: { transform: [{ translateX: '0%' }] },
      100: { transform: [{ translateX: '100vw' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },

  SlideOutLeft: {
    name: 'SlideOutLeft',
    style: {
      0: { transform: [{ translateX: '0%' }] },
      100: { transform: [{ translateX: '-100vw' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },

  SlideOutUp: {
    name: 'SlideOutUp',
    style: {
      0: { transform: [{ translateY: '0%' }] },
      100: { transform: [{ translateY: '-100vh' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },

  SlideOutDown: {
    name: 'SlideOutDown',
    style: {
      0: { transform: [{ translateY: '0%' }] },
      100: { transform: [{ translateY: '100vh' }] },
    },
    duration: DEFAULT_SLIDE_TIME,
  },

  // ====================================================================================
  // LightSpeed In
  // ====================================================================================

  LightSpeedInRight: {
    name: 'LightSpeedInRight',
    style: {
      0: {
        transform: [{ translateX: '100vw', skewX: '-45deg' }],
        opacity: 0,
      },
      70: { transform: [{ skewX: '10deg' }] },
      85: { transform: [{ skewX: '-5deg' }] },
      100: { transform: [{ skewX: '0deg' }] },
    },
    duration: DEFAULT_LIGHTSPEED_TIME,
  },

  LightSpeedInLeft: {
    name: 'LightSpeedInLeft',
    style: {
      0: {
        transform: [{ translateX: '-100vw', skewX: '45deg' }],
        opacity: 0,
      },
      70: { transform: [{ skewX: '-10deg' }] },
      85: { transform: [{ skewX: '5deg' }] },
      100: { transform: [{ skewX: '0deg' }] },
    },
    duration: DEFAULT_LIGHTSPEED_TIME,
  },

  // ====================================================================================
  // LightSpeed Out
  // ====================================================================================

  LightSpeedOutRight: {
    name: 'LightSpeedOutRight',
    style: {
      100: {
        transform: [{ translateX: '100vw', skewX: '-45deg' }],
        opacity: 0,
      },
    },
    duration: DEFAULT_LIGHTSPEED_TIME,
  },

  LightSpeedOutLeft: {
    name: 'LightSpeedOutLeft',
    style: {
      100: {
        transform: [{ translateX: '-100vw', skew: '45deg' }],
        opacity: 0,
      },
    },
    duration: DEFAULT_LIGHTSPEED_TIME,
  },

  // ====================================================================================
  // Pinwheel
  // ====================================================================================

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

  // ====================================================================================
  // Rotate In
  // ====================================================================================

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

  // ====================================================================================
  // Rotate Out
  // ====================================================================================

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

  // ====================================================================================
  // Roll In
  // ====================================================================================

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

// Those are the easings that can be implemented using Bezier curves.
// Others should be done as CSS animations
export const WebEasings: Record<string, number[]> = {
  linear: [0, 0, 1, 1],
  ease: [0.42, 0, 1, 1],
  quad: [0.11, 0, 0.5, 0],
  cubic: [0.32, 0, 0.67, 0],
  sin: [0.12, 0, 0.39, 0],
  circle: [0.55, 0, 1, 0.45],
  exp: [0.7, 0, 0.84, 0],
};
