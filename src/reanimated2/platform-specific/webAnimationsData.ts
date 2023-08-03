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

export const FadeInData: Record<string, AnimationData> = {
  FadeIn: {
    name: 'FadeIn',
    style: {
      0: { opacity: 0 },
      100: { opacity: 1 },
    },
    duration: 0.3,
  },

  FadeInRight: {
    name: 'FadeInRight',
    style: {
      0: {
        opacity: 0,
        transform: [{ translateX: '20%' }],
      },
    },
    duration: 0.3,
  },

  FadeInLeft: {
    name: 'FadeInLeft',
    style: {
      0: {
        opacity: 0,
        transform: [{ translateX: '-20%' }],
      },
    },
    duration: 0.3,
  },

  FadeInUp: {
    name: 'FadeInUp',
    style: {
      0: {
        opacity: 0,
        transform: [{ translateY: '-20%' }],
      },
    },
    duration: 0.3,
  },

  FadeInDown: {
    name: 'FadeInDown',
    style: {
      0: {
        opacity: 0,
        transform: [{ translateY: '20%' }],
      },
    },
    duration: 0.3,
  },
};

export const FadeOutData: Record<string, AnimationData> = {
  FadeOut: {
    name: 'FadeOut',
    style: {
      0: { opacity: 1 },
      100: { opacity: 0 },
    },
    duration: 0.3,
  },

  FadeOutRight: {
    name: 'FadeOutRight',
    style: {
      0: {
        opacity: 1,
        transform: [{ translateX: '0%' }],
      },
      100: {
        opacity: 0,
        transform: [{ translateX: '20%' }],
      },
    },
    duration: 0.3,
  },

  FadeOutLeft: {
    name: 'FadeOutLeft',
    style: {
      0: {
        opacity: 1,
        transform: [{ translateX: '0%' }],
      },
      100: {
        opacity: 0,
        transform: [{ translateX: '-20%' }],
      },
    },
    duration: 0.3,
  },

  FadeOutUp: {
    name: 'FadeOutUp',
    style: {
      0: {
        opacity: 1,
        transform: [{ translateY: '0%' }],
      },
      100: {
        opacity: 0,
        transform: [{ translateY: '-20%' }],
      },
    },
    duration: 0.3,
  },

  FadeOutDown: {
    name: 'FadeOutDown',
    style: {
      0: {
        opacity: 1,
        transform: [{ translateY: '0%' }],
      },
      100: {
        opacity: 0,
        transform: [{ translateY: '20%' }],
      },
    },
    duration: 0.3,
  },
};

export const BounceInData: Record<string, AnimationData> = {
  BounceIn: {
    name: 'BounceIn',
    style: {
      0: { transform: [{ scale: 0.1 }] },
      50: { transform: [{ scale: 1 }] },
      70: { transform: [{ scale: 1.3 }] },
      90: { transform: [{ scale: 0.9 }] },
      100: { transform: [{ scale: 1 }] },
    },
    duration: 0.25,
  },
  BounceInRight: {
    name: 'BounceInRight',
    style: {
      0: { transform: [{ translateX: '100vw' }] },
      50: { transform: [{ translateX: '0%' }] },
      70: { transform: [{ translateX: '-5%' }] },
      90: { transform: [{ translateX: '5%' }] },
      100: { transform: [{ translateX: '0%' }] },
    },
    duration: 0.25,
  },
  BounceInLeft: {
    name: 'BounceInLeft',
    style: {
      0: { transform: [{ translateX: '-100vw' }] },
      50: { transform: [{ translateX: '0%' }] },
      70: { transform: [{ translateX: '5%' }] },
      90: { transform: [{ translateX: '-5%' }] },
      100: { transform: [{ translateX: '0%' }] },
    },
    duration: 0.25,
  },
  BounceInUp: {
    name: 'BounceInUp',
    style: {
      0: { transform: [{ translateY: '-100vh' }] },
      50: { transform: [{ translateY: '0%' }] },
      80: { transform: [{ translateY: '20%' }] },
      90: { transform: [{ translateY: '-20%' }] },
      100: { transform: [{ translateY: '0%' }] },
    },
    duration: 0.25,
  },
  BounceInDown: {
    name: 'BounceInDown',
    style: {
      0: { transform: [{ translateY: '100vh' }] },
      50: { transform: [{ translateY: '0%' }] },
      80: { transform: [{ translateY: '-20%' }] },
      90: { transform: [{ translateY: '20%' }] },
      100: { transform: [{ translateY: '0%' }] },
    },
    duration: 0.25,
  },
};

export const BounceOutData: Record<string, AnimationData> = {
  BounceOut: {
    name: 'BounceOut',
    style: {
      0: { transform: [{ scale: 1 }] },
      10: { transform: [{ scale: 0.9 }] },
      30: { transform: [{ scale: 1.3 }] },
      50: { transform: [{ scale: 1 }] },
      100: { transform: [{ scale: 0.1 }] },
    },
    duration: 0.25,
  },
  BounceOutRight: {
    name: 'BounceOutRight',
    style: {
      0: { transform: [{ translateX: '0%' }] },
      10: { transform: [{ translateX: '5%' }] },
      30: { transform: [{ translateX: '-5%' }] },
      50: { transform: [{ translateX: '0%' }] },
      100: { transform: [{ translateX: '100vw' }] },
    },
    duration: 0.25,
  },
  BounceOutLeft: {
    name: 'BounceOutLeft',
    style: {
      0: { transform: [{ translateX: '0%' }] },
      10: { transform: [{ translateX: '-5%' }] },
      30: { transform: [{ translateX: '5%' }] },
      50: { transform: [{ translateX: '0%' }] },
      100: { transform: [{ translateX: '-100vw' }] },
    },
    duration: 0.25,
  },
  BounceOutUp: {
    name: 'BounceOutUp',
    style: {
      0: { transform: [{ translateY: '0%' }] },
      10: { transform: [{ translateY: '-20%' }] },
      30: { transform: [{ translateY: '20%' }] },
      50: { transform: [{ translateY: '0%' }] },
      100: { transform: [{ translateY: '-100vh' }] },
    },
    duration: 0.25,
  },
  BounceOutDown: {
    name: 'BounceOutDown',
    style: {
      0: { transform: [{ translateY: '0%' }] },
      10: { transform: [{ translateY: '20%' }] },
      30: { transform: [{ translateY: '-20%' }] },
      50: { transform: [{ translateY: '0%' }] },
      100: { transform: [{ translateY: '100vh' }] },
    },
    duration: 0.25,
  },
};

export const FlipInData: Record<string, AnimationData> = {
  FlipInYRight: {
    name: 'FlipInYRight',
    style: {
      0: {
        transform: [
          {
            rotateY: '90deg',
            translateX: '100%',
          },
        ],
        opacity: 0,
      },
      50: { opacity: 1 },
      100: {
        transform: [
          {
            rotateY: '0deg',
            translateX: '0%',
          },
        ],
      },
    },
    duration: 0.3,
  },
  FlipInYLeft: {
    name: 'FlipInYLeft',
    style: {
      0: {
        transform: [
          {
            rotateY: '-90deg',
            translateX: '-100%',
          },
        ],
        opacity: 0,
      },
      50: { opacity: 1 },
      100: {
        transform: [
          {
            rotateY: '0deg',
            translateX: '0%',
          },
        ],
      },
    },
    duration: 0.3,
  },
  FlipInXUp: {
    name: 'FlipInXUp',
    style: {
      0: {
        transform: [
          {
            rotateX: '90deg',
            translateY: '-100%',
          },
        ],
        opacity: 0,
      },
      50: { opacity: 1 },
      100: {
        transform: [
          {
            rotateX: '0deg',
            translateY: '0%',
          },
        ],
      },
    },
    duration: 0.3,
  },
  FlipInXDown: {
    name: 'FlipInXDown',
    style: {
      0: {
        transform: [
          {
            rotateX: '-90deg',
            translateY: '100%',
          },
        ],
        opacity: 0,
      },
      50: { opacity: 1 },
      100: {
        transform: [
          {
            rotateX: '0deg',
            translateY: '0%',
          },
        ],
      },
    },
    duration: 0.3,
  },
  FlipInEasyX: {
    name: 'FlipInEasyX',
    style: {
      0: {
        transform: [
          {
            perspective: '200px',
            rotateX: '90deg',
          },
        ],
      },
      100: { transform: [{ rotateX: '0deg' }] },
    },
    duration: 0.3,
  },
  FlipInEasyY: {
    name: 'FlipInEasyY',
    style: {
      0: { transform: [{ rotateY: '-90deg' }] },
      100: { transform: [{ rotateY: '0deg' }] },
    },
    duration: 0.3,
  },
};

export const FlipOutData: Record<string, AnimationData> = {
  FlipOutYRight: {
    name: 'FlipOutYRight',
    style: {
      0: {
        transform: [
          {
            rotateY: '0deg',
            translateX: '0%',
          },
        ],
        opacity: 1,
      },
      50: { opacity: 0 },
      100: {
        transform: [
          {
            rotateY: '90deg',
            translateX: '100%',
          },
        ],
      },
    },
    duration: 0.3,
  },
  FlipOutYLeft: {
    name: 'FlipOutYLeft',
    style: {
      0: {
        transform: [
          {
            rotateY: '0deg',
            translateX: '0%',
          },
        ],
        opacity: 1,
      },
      50: { opacity: 0 },
      100: {
        transform: [
          {
            rotateY: '-90deg',
            translateX: '-100%',
          },
        ],
      },
    },
    duration: 0.3,
  },
  FlipOutXUp: {
    name: 'FlipOutXUp',
    style: {
      0: {
        transform: [
          {
            rotateX: '0deg',
            translateY: '0%',
          },
        ],
        opacity: 1,
      },
      50: { opacity: 0 },
      100: {
        transform: [
          {
            rotateX: '90deg',
            translateY: '-100%',
          },
        ],
      },
    },
    duration: 0.3,
  },
  FlipOutXDown: {
    name: 'FlipOutXDown',
    style: {
      0: {
        transform: [
          {
            rotateX: '0deg',
            translateY: '0%',
          },
        ],
        opacity: 1,
      },
      50: { opacity: 0 },
      100: {
        transform: [
          {
            rotateX: '90deg',
            translateY: '100%',
          },
        ],
      },
    },
    duration: 0.3,
  },
  FlipOutEasyX: {
    name: 'FlipOutEasyX',
    style: {
      0: {
        transform: [
          {
            perspective: '200px',
            rotateX: '0deg',
          },
        ],
        opacity: 1,
      },
      100: { transform: [{ rotateX: '90deg' }] },
    },
    duration: 0.3,
  },
  FlipOutEasyY: {
    name: 'FlipOutEasyY',
    style: {
      0: {
        transform: [{ rotateY: '0deg' }],
        opacity: 1,
      },
      100: { transform: [{ rotateY: '-90deg' }] },
    },
    duration: 0.3,
  },
};

export const StretchInData: Record<string, AnimationData> = {
  StretchInX: {
    name: 'StretchInX',
    style: {
      0: { transform: [{ scaleX: 0 }] },
      100: { transform: [{ scaleX: 1 }] },
    },
    duration: 0.3,
  },
  StretchInY: {
    name: 'StretchInY',
    style: {
      0: { transform: [{ scaleY: 0 }] },
      100: { transform: [{ scaleY: 1 }] },
    },
    duration: 0.3,
  },
};

export const StretchOutData: Record<string, AnimationData> = {
  StretchOutX: {
    name: 'StretchOutX',
    style: {
      0: { transform: [{ scaleX: 1 }] },
      100: { transform: [{ scaleX: 0 }] },
    },
    duration: 0.3,
  },
  StretchOutY: {
    name: 'StretchOutY',
    style: {
      0: { transform: [{ scaleY: 1 }] },
      100: { transform: [{ scaleY: 0 }] },
    },
    duration: 0.3,
  },
};

export const ZoomInData: Record<string, AnimationData> = {
  ZoomIn: {
    name: 'ZoomIn',
    style: {
      0: { transform: [{ scale: 0 }] },
      100: { transform: [{ scale: 1 }] },
    },
    duration: 0.3,
  },
  ZoomInRotate: {
    name: 'ZoomInRotate',
    style: {
      0: {
        transform: [
          {
            scale: 0,
            rotate: '45deg',
          },
        ],
      },
      100: {
        transform: [
          {
            scale: 1,
            rotate: '0deg',
          },
        ],
      },
    },
    duration: 0.3,
  },
  ZoomInRight: {
    name: 'ZoomInRight',
    style: {
      0: {
        transform: [
          {
            translateX: '100vw',
            scale: 0,
          },
        ],
      },
      100: {
        transform: [
          {
            translateX: '0%',
            scale: 1,
          },
        ],
      },
    },
    duration: 0.3,
  },
  ZoomInLeft: {
    name: 'ZoomInLeft',
    style: {
      0: {
        transform: [
          {
            translateX: '-100vw',
            scale: 0,
          },
        ],
      },
      100: {
        transform: [
          {
            translateX: '0%',
            scale: 1,
          },
        ],
      },
    },
    duration: 0.3,
  },
  ZoomInUp: {
    name: 'ZoomInUp',
    style: {
      0: {
        transform: [
          {
            translateY: '-100vh',
            scale: 0,
          },
        ],
      },
      100: {
        transform: [
          {
            translateY: '0%',
            scale: 1,
          },
        ],
      },
    },
    duration: 0.3,
  },
  ZoomInDown: {
    name: 'ZoomInDown',
    style: {
      0: {
        transform: [
          {
            translateY: '100vh',
            scale: 0,
          },
        ],
      },
      100: {
        transform: [
          {
            translateY: '0%',
            scale: 1,
          },
        ],
      },
    },
    duration: 0.3,
  },
  ZoomInEasyUp: {
    name: 'ZoomInEasyUp',
    style: {
      0: {
        transform: [
          {
            translateY: '-100%',
            scale: 0,
          },
        ],
      },
      100: {
        transform: [
          {
            translateY: '0%',
            scale: 1,
          },
        ],
      },
    },
    duration: 0.3,
  },
  ZoomInEasyDown: {
    name: 'ZoomInEasyDown',
    style: {
      0: {
        transform: [
          {
            translateY: '100%',
            scale: 0,
          },
        ],
      },
      100: {
        transform: [
          {
            translateY: '0%',
            scale: 1,
          },
        ],
      },
    },
    duration: 0.3,
  },
};

export const ZoomOutData: Record<string, AnimationData> = {
  ZoomOut: {
    name: 'ZoomOut',
    style: {
      0: { transform: [{ scale: 1 }] },
      100: { transform: [{ scale: 0 }] },
    },
    duration: 0.3,
  },
  ZoomOutRotate: {
    name: 'ZoomOutRotate',
    style: {
      0: {
        transform: [
          {
            scale: 1,
            rotate: '0deg',
          },
        ],
      },
      100: {
        transform: [
          {
            scale: 0,
            rotate: '45deg',
          },
        ],
      },
    },
    duration: 0.3,
  },
  ZoomOutRight: {
    name: 'ZoomOutRight',
    style: {
      0: {
        transform: [
          {
            translateX: '0%',
            scale: 1,
          },
        ],
      },
      100: {
        transform: [
          {
            translateX: '100vw',
            scale: 0,
          },
        ],
      },
    },
    duration: 0.3,
  },
  ZoomOutLeft: {
    name: 'ZoomOutLeft',
    style: {
      0: {
        transform: [
          {
            translateX: '0%',
            scale: 1,
          },
        ],
      },
      100: {
        transform: [
          {
            translateX: '-100vw',
            scale: 1,
          },
        ],
      },
    },
    duration: 0.3,
  },
  ZoomOutUp: {
    name: 'ZoomOutUp',
    style: {
      0: {
        transform: [
          {
            translateY: '0%',
            scale: 1,
          },
        ],
      },
      100: {
        transform: [
          {
            translateY: '-100vh',
            scale: 0,
          },
        ],
      },
    },
    duration: 0.3,
  },
  ZoomOutDown: {
    name: 'ZoomOutDown',
    style: {
      0: {
        transform: [
          {
            translateY: '0%',
            scale: 1,
          },
        ],
      },
      100: {
        transform: [
          {
            translateY: '100vh',
            scale: 0,
          },
        ],
      },
    },
    duration: 0.3,
  },
  ZoomOutEasyUp: {
    name: 'ZoomOutEasyUp',
    style: {
      0: {
        transform: [
          {
            translateY: '0%',
            scale: 1,
          },
        ],
      },
      100: {
        transform: [
          {
            translateY: '-100%',
            scale: 0,
          },
        ],
      },
    },
    duration: 0.3,
  },
  ZoomOutEasyDown: {
    name: 'ZoomOutEasyDown',
    style: {
      0: {
        transform: [
          {
            translateY: '0%',
            scale: 1,
          },
        ],
      },
      100: {
        transform: [
          {
            translateY: '100%',
            scale: 0,
          },
        ],
      },
    },
    duration: 0.3,
  },
};

export const SlideInData: Record<string, AnimationData> = {
  SlideInRight: {
    name: 'SlideInRight',
    style: {
      0: { transform: [{ translateX: '100vw' }] },
      100: { transform: [{ translateX: '0%' }] },
    },
    duration: 0.3,
  },
  SlideInLeft: {
    name: 'SlideInLeft',
    style: {
      0: { transform: [{ translateX: '-100vw' }] },
      100: { transform: [{ translateX: '0%' }] },
    },
    duration: 0.3,
  },
  SlideInUp: {
    name: 'SlideInUp',
    style: {
      0: { transform: [{ translateY: '-100vh' }] },
      100: { transform: [{ translateY: '0%' }] },
    },
    duration: 0.3,
  },
  SlideInDown: {
    name: 'SlideInDown',
    style: {
      0: { transform: [{ translateY: '100vh' }] },
      100: { transform: [{ translateY: '0%' }] },
    },
    duration: 0.3,
  },
};

export const SlideOutData: Record<string, AnimationData> = {
  SlideOutRight: {
    name: 'SlideOutRight',
    style: {
      0: { transform: [{ translateX: '0%' }] },
      100: { transform: [{ translateX: '100vw' }] },
    },
    duration: 0.3,
  },
  SlideOutLeft: {
    name: 'SlideOutLeft',
    style: {
      0: { transform: [{ translateX: '0%' }] },
      100: { transform: [{ translateX: '-100vw' }] },
    },
    duration: 0.3,
  },
  SlideOutUp: {
    name: 'SlideOutUp',
    style: {
      0: { transform: [{ translateY: '0%' }] },
      100: { transform: [{ translateY: '-100vh' }] },
    },
    duration: 0.3,
  },
  SlideOutDown: {
    name: 'SlideOutDown',
    style: {
      0: { transform: [{ translateY: '0%' }] },
      100: { transform: [{ translateY: '100vh' }] },
    },
    duration: 0.3,
  },
};

export const LightSpeedInData: Record<string, AnimationData> = {
  LightSpeedInRight: {
    name: 'LightSpeedInRight',
    style: {
      0: {
        transform: [
          {
            translateX: '100vw',
            skew: '-15deg',
          },
        ],
        opacity: 0.2,
      },
    },
    duration: 0.25,
  },
  LightSpeedInLeft: {
    name: 'LightSpeedInLeft',
    style: {
      0: {
        transform: [
          {
            translateX: '-100vw',
            skew: '15deg',
          },
        ],
        opacity: 0.2,
      },
    },
    duration: 0.25,
  },
};

export const LightSpeedOutData: Record<string, AnimationData> = {
  LightSpeedOutRight: {
    name: 'LightSpeedOutRight',
    style: {
      100: {
        transform: [
          {
            translateX: '100vw',
            skew: '-15deg',
          },
        ],
        opacity: 0.2,
      },
    },
    duration: 0.25,
  },
  LightSpeedOutLeft: {
    name: 'LightSpeedOutLeft',
    style: {
      100: {
        transform: [
          {
            translateX: '-100vw',
            skew: '15deg',
          },
        ],
        opacity: 0.2,
      },
    },
    duration: 0.25,
  },
};

export const PinwheelData: Record<string, AnimationData> = {
  PinwheelIn: {
    name: 'PinwheelIn',
    style: {
      0: {
        transform: [
          {
            rotate: '360deg',
            scale: 0,
          },
        ],
        opacity: 0,
      },
      100: {
        transform: [
          {
            rotate: '0deg',
            scale: 1,
          },
        ],
        opacity: 1,
      },
    },
    duration: 0.3,
  },
  PinwheelOut: {
    name: 'PinwheelOut',
    style: {
      0: {
        transform: [
          {
            rotate: '0deg',
            scale: 1,
          },
        ],
        opacity: 1,
      },
      100: {
        transform: [
          {
            rotate: '360deg',
            scale: 0,
          },
        ],
        opacity: 0,
      },
    },
    duration: 0.3,
  },
};

export const RotateInData: Record<string, AnimationData> = {
  RotateInDownLeft: {
    name: 'RotateInDownLeft',
    style: {
      0: {
        transform: [
          {
            translateX: '-40%',
            translateY: '-250%',
            rotate: '-90deg',
          },
        ],
        opacity: 0,
      },

      100: {
        transform: [{ rotate: '0deg' }],
        opacity: 1,
      },
    },
    duration: 0.3,
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
        transform: [{ rotate: '0deg' }],
        opacity: 1,
      },
    },
    duration: 0.3,
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
        transform: [{ rotate: '0deg' }],
        opacity: 1,
      },
    },
    duration: 0.3,
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
        transform: [{ rotate: '0deg' }],
        opacity: 1,
      },
    },
    duration: 0.3,
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
    duration: 0.3,
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
    duration: 0.3,
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
    duration: 0.3,
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
    duration: 0.3,
  },
};

export const RollData: Record<string, AnimationData> = {
  RollInLeft: {
    name: 'RollInLeft',
    style: {
      0: {
        transform: [
          {
            translateX: '-100%',
            rotate: '-180deg',
          },
        ],
      },
    },
    duration: 0.3,
  },
  RollInRight: {
    name: 'RollInRight',
    style: {
      0: {
        transform: [
          {
            translateX: '100%',
            rotate: '180deg',
          },
        ],
      },
    },
    duration: 0.3,
  },
  RollOutLeft: {
    name: 'RollOutLeft',
    style: {
      100: {
        transform: [
          {
            translateX: '-100%',
            rotate: '-180deg',
          },
        ],
      },
    },
    duration: 0.3,
  },
  RollOutRight: {
    name: 'RollOutRight',
    style: {
      100: {
        transform: [
          {
            translateX: '100%',
            rotate: '180deg',
          },
        ],
      },
    },
    duration: 0.3,
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
