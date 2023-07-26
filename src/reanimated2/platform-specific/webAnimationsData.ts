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
  transform?: TransformProperties;
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
    duration: 0.35,
  },

  FadeInRight: {
    name: 'FadeInRight',
    style: {
      0: {
        opacity: 0,
        transform: { translateX: '20%' },
      },
    },
    duration: 0.35,
  },

  FadeInLeft: {
    name: 'FadeInLeft',
    style: {
      0: {
        opacity: 0,
        transform: { translateX: '-20%' },
      },
    },
    duration: 0.35,
  },

  FadeInUp: {
    name: 'FadeInUp',
    style: {
      0: {
        opacity: 0,
        transform: { translateY: '-20%' },
      },
    },
    duration: 0.35,
  },

  FadeInDown: {
    name: 'FadeInDown',
    style: {
      0: {
        opacity: 0,
        transform: { translateY: '20%' },
      },
    },
    duration: 0.35,
  },
};

export const FadeOutData: Record<string, AnimationData> = {
  FadeOut: {
    name: 'FadeOut',
    style: {
      0: { opacity: 1 },
      100: { opacity: 0 },
    },
    duration: 0.35,
  },

  FadeOutRight: {
    name: 'FadeOutRight',
    style: {
      0: {
        opacity: 1,
        transform: { translateX: '0%' },
      },
      100: {
        opacity: 0,
        transform: { translateX: '20%' },
      },
    },
    duration: 0.35,
  },

  FadeOutLeft: {
    name: 'FadeOutLeft',
    style: {
      0: {
        opacity: 1,
        transform: { translateX: '0%' },
      },
      100: {
        opacity: 0,
        transform: { translateX: '-20%' },
      },
    },
    duration: 0.35,
  },

  FadeOutUp: {
    name: 'FadeOutUp',
    style: {
      0: {
        opacity: 1,
        transform: { translateY: '0%' },
      },
      100: {
        opacity: 0,
        transform: { translateY: '-20%' },
      },
    },
    duration: 0.35,
  },

  FadeOutDown: {
    name: 'FadeOutDown',
    style: {
      0: {
        opacity: 1,
        transform: { translateY: '0%' },
      },
      100: {
        opacity: 0,
        transform: { translateY: '20%' },
      },
    },
    duration: 0.35,
  },
};

export const BounceInData: Record<string, AnimationData> = {
  BounceIn: {
    name: 'BounceIn',
    style: {
      0: { transform: { scale: 0.1 } },
      50: { transform: { scale: 1 } },
      70: { transform: { scale: 1.3 } },
      90: { transform: { scale: 0.9 } },
      100: { transform: { scale: 1 } },
    },
    duration: 0.35,
  },
  BounceInRight: {
    name: 'BounceInRight',
    style: {
      0: { transform: { translateX: '1000%' } },
      50: { transform: { translateX: '0%' } },
      70: { transform: { translateX: '-5%' } },
      90: { transform: { translateX: '5%' } },
      100: { transform: { translateX: '0%' } },
    },
    duration: 0.35,
  },
  BounceInLeft: {
    name: 'BounceInLeft',
    style: {
      0: { transform: { translateX: '-1000%' } },
      50: { transform: { translateX: '0%' } },
      70: { transform: { translateX: '5%' } },
      90: { transform: { translateX: '-5%' } },
      100: { transform: { translateX: '0%' } },
    },
    duration: 0.35,
  },
  BounceInUp: {
    name: 'BounceInUp',
    style: {
      0: { transform: { translateY: '-10000%' } },
      50: { transform: { translateY: '0%' } },
      80: { transform: { translateY: '20%' } },
      90: { transform: { translateY: '-20%' } },
      100: { transform: { translateY: '0%' } },
    },
    duration: 0.35,
  },
  BounceInDown: {
    name: 'BounceInDown',
    style: {
      0: { transform: { translateY: '10000%' } },
      50: { transform: { translateY: '0%' } },
      80: { transform: { translateY: '-20%' } },
      90: { transform: { translateY: '20%' } },
      100: { transform: { translateY: '0%' } },
    },
    duration: 0.35,
  },
};

export const BounceOutData: Record<string, AnimationData> = {
  BounceOut: {
    name: 'BounceOut',
    style: {
      0: { transform: { scale: 1 } },
      10: { transform: { scale: 0.9 } },
      30: { transform: { scale: 1.3 } },
      50: { transform: { scale: 1 } },
      100: { transform: { scale: 0.1 } },
    },
    duration: 0.35,
  },
  BounceOutRight: {
    name: 'BounceOutRight',
    style: {
      0: { transform: { translateX: '0%' } },
      10: { transform: { translateX: '5%' } },
      30: { transform: { translateX: '-5%' } },
      50: { transform: { translateX: '0%' } },
      100: { transform: { translateX: '1000%' } },
    },
    duration: 0.35,
  },
  BounceOutLeft: {
    name: 'BounceOutLeft',
    style: {
      0: { transform: { translateX: '0%' } },
      10: { transform: { translateX: '5%' } },
      30: { transform: { translateX: '5%' } },
      50: { transform: { translateX: '0%' } },
      100: { transform: { translateX: '-1000%' } },
    },
    duration: 0.35,
  },
  BounceOutUp: {
    name: 'BounceOutUp',
    style: {
      0: { transform: { translateY: '0%' } },
      10: { transform: { translateY: '-20%' } },
      30: { transform: { translateY: '20%' } },
      50: { transform: { translateY: '0%' } },
      100: { transform: { translateY: '-10000%' } },
    },
    duration: 0.35,
  },
  BounceOutDown: {
    name: 'BounceOutDown',
    style: {
      0: { transform: { translateY: '0%' } },
      10: { transform: { translateY: '20%' } },
      30: { transform: { translateY: '-20%' } },
      50: { transform: { translateY: '0%' } },
      100: { transform: { translateY: '10000%' } },
    },
    duration: 0.35,
  },
};

export const FlipInData: Record<string, AnimationData> = {
  FlipInYRight: {
    name: 'FlipInYRight',
    style: {
      0: {
        transform: {
          rotateY: '90deg',
          translateX: '100%',
        },
        opacity: 0,
      },
      50: { opacity: 1 },
      100: {
        transform: {
          rotateY: '0deg',
          translateX: '0%',
        },
      },
    },
    duration: 0.35,
  },
  FlipInYLeft: {
    name: 'FlipInYLeft',
    style: {
      0: {
        transform: {
          rotateY: '-90deg',
          translateX: '-100%',
        },
        opacity: 0,
      },
      50: { opacity: 1 },
      100: {
        transform: {
          rotateY: '0deg',
          translateX: '0%',
        },
      },
    },
    duration: 0.35,
  },
  FlipInXUp: {
    name: 'FlipInXUp',
    style: {
      0: {
        transform: {
          rotateX: '90deg',
          translateY: '-100%',
        },
        opacity: 0,
      },
      50: { opacity: 1 },
      100: {
        transform: {
          rotateX: '0deg',
          translateY: '0%',
        },
      },
    },
    duration: 0.35,
  },
  FlipInXDown: {
    name: 'FlipInXDown',
    style: {
      0: {
        transform: {
          rotateX: '-90deg',
          translateY: '100%',
        },
        opacity: 0,
      },
      50: { opacity: 1 },
      100: {
        transform: {
          rotateX: '0deg',
          translateY: '0%',
        },
      },
    },
    duration: 0.35,
  },
  FlipInEasyX: {
    name: 'FlipInEasyX',
    style: {
      0: {
        transform: {
          perspective: '200px',
          rotateX: '90deg',
        },
      },
      100: { transform: { rotateX: '0deg' } },
    },
    duration: 0.35,
  },
  FlipInEasyY: {
    name: 'FlipInEasyY',
    style: {
      0: { transform: { rotateY: '-90deg' } },
      100: { transform: { rotateY: '0deg' } },
    },
    duration: 0.35,
  },
};

export const FlipOutData: Record<string, AnimationData> = {
  FlipOutYRight: {
    name: 'FlipOutYRight',
    style: {
      0: {
        transform: {
          rotateY: '0deg',
          translateX: '0%',
        },
        opacity: 1,
      },
      50: { opacity: 0 },
      100: {
        transform: {
          rotateY: '90deg',
          translateX: '100%',
        },
      },
    },
    duration: 0.35,
  },
  FlipOutYLeft: {
    name: 'FlipOutYLeft',
    style: {
      0: {
        transform: {
          rotateY: '0deg',
          translateX: '0%',
        },
        opacity: 1,
      },
      50: { opacity: 0 },
      100: {
        transform: {
          rotateY: '-90deg',
          translateX: '-100%',
        },
      },
    },
    duration: 0.35,
  },
  FlipOutXUp: {
    name: 'FlipOutXUp',
    style: {
      0: {
        transform: {
          rotateX: '0deg',
          translateY: '0%',
        },
        opacity: 1,
      },
      50: { opacity: 0 },
      100: {
        transform: {
          rotateX: '90deg',
          translateY: '-100%',
        },
      },
    },
    duration: 0.35,
  },
  FlipOutXDown: {
    name: 'FlipOutXDown',
    style: {
      0: {
        transform: {
          rotateX: '0deg',
          translateY: '0%',
        },
        opacity: 1,
      },
      50: { opacity: 0 },
      100: {
        transform: {
          rotateX: '90deg',
          translateY: '100%',
        },
      },
    },
    duration: 0.35,
  },
  FlipOutEasyX: {
    name: 'FlipOutEasyX',
    style: {
      0: {
        transform: {
          perspective: '200px',
          rotateX: '0deg',
        },
        opacity: 1,
      },
      100: { transform: { rotateX: '90deg' } },
    },
    duration: 0.35,
  },
  FlipOutEasyY: {
    name: 'FlipOutEasyY',
    style: {
      0: {
        transform: { rotateY: '0deg' },
        opacity: 1,
      },
      100: { transform: { rotateY: '-90deg' } },
    },
    duration: 0.35,
  },
};

export const StretchInData: Record<string, AnimationData> = {
  StretchInX: {
    name: 'StretchInX',
    style: {
      0: { transform: { scaleX: 0 } },
      100: { transform: { scaleX: 1 } },
    },
    duration: 0.35,
  },
  StretchInY: {
    name: 'StretchInY',
    style: {
      0: { transform: { scaleY: 0 } },
      100: { transform: { scaleY: 1 } },
    },
    duration: 0.35,
  },
};

export const StretchOutData: Record<string, AnimationData> = {
  StretchOutX: {
    name: 'StretchOutX',
    style: {
      0: { transform: { scaleX: 1 } },
      100: { transform: { scaleX: 0 } },
    },
    duration: 0.35,
  },
  StretchOutY: {
    name: 'StretchOutY',
    style: {
      0: { transform: { scaleY: 1 } },
      100: { transform: { scaleY: 0 } },
    },
    duration: 0.35,
  },
};

export const ZoomInData: Record<string, AnimationData> = {
  ZoomIn: {
    name: 'ZoomIn',
    style: {
      0: { transform: { scale: 0 } },
      100: { transform: { scale: 1 } },
    },
    duration: 0.35,
  },
  ZoomInRotate: {
    name: 'ZoomInRotate',
    style: {
      0: {
        transform: {
          scale: 0,
          rotate: '45deg',
        },
      },
      100: {
        transform: {
          scale: 1,
          rotate: '0deg',
        },
      },
    },
    duration: 0.35,
  },
  ZoomInRight: {
    name: 'ZoomInRight',
    style: {
      0: {
        transform: {
          translateX: '100%',
          scale: 0,
        },
      },
      100: {
        transform: {
          translateX: '0%',
          scale: 1,
        },
      },
    },
    duration: 0.35,
  },
  ZoomInLeft: {
    name: 'ZoomInLeft',
    style: {
      0: {
        transform: {
          translateX: '-100%',
          scale: 0,
        },
      },
      100: {
        transform: {
          translateX: '0%',
          scale: 1,
        },
      },
    },
    duration: 0.35,
  },
  ZoomInUp: {
    name: 'ZoomInUp',
    style: {
      0: {
        transform: {
          translateY: '-10000%',
          scale: 0,
        },
      },
      100: {
        transform: {
          translateY: '0%',
          scale: 1,
        },
      },
    },
    duration: 0.35,
  },
  ZoomInDown: {
    name: 'ZoomInDown',
    style: {
      0: {
        transform: {
          translateY: '10000%',
          scale: 0,
        },
      },
      100: {
        transform: {
          translateY: '0%',
          scale: 1,
        },
      },
    },
    duration: 0.35,
  },
  ZoomInEasyUp: {
    name: 'ZoomInEasyUp',
    style: {
      0: {
        transform: {
          translateY: '-100%',
          scale: 0,
        },
      },
      100: {
        transform: {
          translateY: '0%',
          scale: 1,
        },
      },
    },
    duration: 0.35,
  },
  ZoomInEasyDown: {
    name: 'ZoomInEasyDown',
    style: {
      0: {
        transform: {
          translateY: '100%',
          scale: 0,
        },
      },
      100: {
        transform: {
          translateY: '0%',
          scale: 1,
        },
      },
    },
    duration: 0.35,
  },
};

export const ZoomOutData: Record<string, AnimationData> = {
  ZoomOut: {
    name: 'ZoomOut',
    style: {
      0: { transform: { scale: 1 } },
      100: { transform: { scale: 0 } },
    },
    duration: 0.35,
  },
  ZoomOutRotate: {
    name: 'ZoomOutRotate',
    style: {
      0: {
        transform: {
          scale: 1,
          rotate: '0deg',
        },
      },
      100: {
        transform: {
          scale: 0,
          rotate: '45deg',
        },
      },
    },
    duration: 0.35,
  },
  ZoomOutRight: {
    name: 'ZoomOutRight',
    style: {
      0: {
        transform: {
          translateX: '0%',
          scale: 1,
        },
      },
      100: {
        transform: {
          translateX: '1000%',
          scale: 0,
        },
      },
    },
    duration: 0.35,
  },
  ZoomOutLeft: {
    name: 'ZoomOutLeft',
    style: {
      0: {
        transform: {
          translateX: '0%',
          scale: 1,
        },
      },
      100: {
        transform: {
          translateX: '-1000%',
          scale: 1,
        },
      },
    },
    duration: 0.35,
  },
  ZoomOutUp: {
    name: 'ZoomOutUp',
    style: {
      0: {
        transform: {
          translateY: '0%',
          scale: 1,
        },
      },
      100: {
        transform: {
          translateY: '-10000%',
          scale: 0,
        },
      },
    },
    duration: 0.35,
  },
  ZoomOutDown: {
    name: 'ZoomOutDown',
    style: {
      0: {
        transform: {
          translateY: '0%',
          scale: 1,
        },
      },
      100: {
        transform: {
          translateY: '10000%',
          scale: 0,
        },
      },
    },
    duration: 0.35,
  },
  ZoomOutEasyUp: {
    name: 'ZoomOutEasyUp',
    style: {
      0: {
        transform: {
          translateY: '0%',
          scale: 1,
        },
      },
      100: {
        transform: {
          translateY: '-100%',
          scale: 0,
        },
      },
    },
    duration: 0.35,
  },
  ZoomOutEasyDown: {
    name: 'ZoomOutEasyDown',
    style: {
      0: {
        transform: {
          translateY: '0%',
          scale: 1,
        },
      },
      100: {
        transform: {
          translateY: '100%',
          scale: 0,
        },
      },
    },
    duration: 0.35,
  },
};

export const SlideInData: Record<string, AnimationData> = {
  SlideInRight: {
    name: 'SlideInRight',
    style: {
      0: { transform: { translateX: '1000%' } },
      100: { transform: { translateX: '0%' } },
    },
    duration: 0.35,
  },
  SlideInLeft: {
    name: 'SlideInLeft',
    style: {
      0: { transform: { translateX: '-1000%' } },
      100: { transform: { translateX: '0%' } },
    },
    duration: 0.35,
  },
  SlideInUp: {
    name: 'SlideInUp',
    style: {
      0: { transform: { translateY: '-10000%' } },
      100: { transform: { translateY: '0%' } },
    },
    duration: 0.35,
  },
  SlideInDown: {
    name: 'SlideInDown',
    style: {
      0: { transform: { translateY: '10000%' } },
      100: { transform: { translateY: '0%' } },
    },
    duration: 0.35,
  },
};

export const SlideOutData: Record<string, AnimationData> = {
  SlideOutRight: {
    name: 'SlideOutRight',
    style: {
      0: { transform: { translateX: '0%' } },
      100: { transform: { translateX: '1000%' } },
    },
    duration: 0.35,
  },
  SlideOutLeft: {
    name: 'SlideOutLeft',
    style: {
      0: { transform: { translateX: '0%' } },
      100: { transform: { translateX: '-1000%' } },
    },
    duration: 0.35,
  },
  SlideOutUp: {
    name: 'SlideOutUp',
    style: {
      0: { transform: { translateY: '0%' } },
      100: { transform: { translateY: '-10000%' } },
    },
    duration: 0.35,
  },
  SlideOutDown: {
    name: 'SlideOutDown',
    style: {
      0: { transform: { translateY: '0%' } },
      100: { transform: { translateY: '10000%' } },
    },
    duration: 0.35,
  },
};

export const LightSpeedInData: Record<string, AnimationData> = {
  LightSpeedInRight: {
    name: 'LightSpeedInRight',
    style: {
      0: {
        transform: {
          translateX: '100%',
          skew: '-15deg',
        },
        opacity: 0.2,
      },
    },
    duration: 0.35,
  },
  LightSpeedInLeft: {
    name: 'LightSpeedInLeft',
    style: {
      0: {
        transform: {
          translateX: '-100%',
          skew: '15deg',
        },
        opacity: 0.2,
      },
    },
    duration: 0.35,
  },
};

export const LightSpeedOutData: Record<string, AnimationData> = {
  LightSpeedOutRight: {
    name: 'LightSpeedOutRight',
    style: {
      100: {
        transform: {
          translateX: '100%',
          skew: '-15deg',
        },
        opacity: 0.2,
      },
    },
    duration: 0.35,
  },
  LightSpeedOutLeft: {
    name: 'LightSpeedOutLeft',
    style: {
      100: {
        transform: {
          translateX: '-100%',
          skew: '15deg',
        },
        opacity: 0.2,
      },
    },
    duration: 0.35,
  },
};

export const PinwheelData: Record<string, AnimationData> = {
  PinwheelIn: {
    name: 'PinwheelIn',
    style: {
      0: {
        transform: {
          rotate: '360deg',
          scale: 0,
        },
        opacity: 0,
      },
      100: {
        transform: {
          rotate: '0deg',
          scale: 1,
        },
        opacity: 1,
      },
    },
    duration: 0.35,
  },
  PinwheelOut: {
    name: 'PinwheelOut',
    style: {
      0: {
        transform: {
          rotate: '0deg',
          scale: 1,
        },
        opacity: 1,
      },
      100: {
        transform: {
          rotate: '360deg',
          scale: 0,
        },
        opacity: 0,
      },
    },
    duration: 0.35,
  },
};

export const RotateInData: Record<string, AnimationData> = {
  RotateInDownLeft: {
    name: 'RotateInDownLeft',
    style: {
      0: {
        transform: {
          translateX: '-40%',
          translateY: '-250%',
          rotate: '-90deg',
        },
        opacity: 0,
      },

      100: {
        transform: { rotate: '0deg' },
        opacity: 1,
      },
    },
    duration: 0.35,
  },
  RotateInDownRight: {
    name: 'RotateInDownRight',
    style: {
      0: {
        transform: {
          translateX: '40%',
          translateY: '-250%',
          rotate: '90deg',
        },
        opacity: 0,
      },

      100: {
        transform: { rotate: '0deg' },
        opacity: 1,
      },
    },
    duration: 0.35,
  },
  RotateInUpLeft: {
    name: 'RotateInUpLeft',
    style: {
      0: {
        transform: {
          translateX: '-40%',
          translateY: '250%',
          rotate: '90deg',
        },
        opacity: 0,
      },

      100: {
        transform: { rotate: '0deg' },
        opacity: 1,
      },
    },
    duration: 0.35,
  },
  RotateInUpRight: {
    name: 'RotateInUpRight',
    style: {
      0: {
        transform: {
          translateX: '40%',
          translateY: '250%',
          rotate: '-90deg',
        },
        opacity: 0,
      },

      100: {
        transform: { rotate: '0deg' },
        opacity: 1,
      },
    },
    duration: 0.35,
  },
};

export const RotateOutData: Record<string, AnimationData> = {
  RotateOutDownLeft: {
    name: 'RotateOutDownLeft',
    style: {
      100: {
        transform: {
          translateX: '-40%',
          translateY: '250%',
          rotate: '90deg',
        },
        opacity: 0,
      },
    },
    duration: 0.35,
  },
  RotateOutDownRight: {
    name: 'RotateOutDownRight',
    style: {
      100: {
        transform: {
          translateX: '40%',
          translateY: '250%',
          rotate: '-90deg',
        },
        opacity: 0,
      },
    },
    duration: 0.35,
  },
  RotateOutUpLeft: {
    name: 'RotateOutUpLeft',
    style: {
      100: {
        transform: {
          translateX: '-40%',
          translateY: '-250%',
          rotate: '-90deg',
        },
        opacity: 0,
      },
    },
    duration: 0.35,
  },
  RotateOutUpRight: {
    name: 'RotateOutUpRight',
    style: {
      100: {
        transform: {
          translateX: '40%',
          translateY: '-250%',
          rotate: '90deg',
        },
        opacity: 0,
      },
    },
    duration: 0.35,
  },
};

export const RollData: Record<string, AnimationData> = {
  RollInLeft: {
    name: 'RollInLeft',
    style: {
      0: {
        transform: {
          translateX: '-100%',
          rotate: '-180deg',
        },
      },
    },
    duration: 0.35,
  },
  RollInRight: {
    name: 'RollInRight',
    style: {
      0: {
        transform: {
          translateX: '100%',
          rotate: '180deg',
        },
      },
    },
    duration: 0.35,
  },
  RollOutLeft: {
    name: 'RollOutLeft',
    style: {
      100: {
        transform: {
          translateX: '-100%',
          rotate: '-180deg',
        },
      },
    },
    duration: 0.35,
  },
  RollOutRight: {
    name: 'RollOutRight',
    style: {
      100: {
        transform: {
          translateX: '100%',
          rotate: '180deg',
        },
      },
    },
    duration: 0.35,
  },
};
