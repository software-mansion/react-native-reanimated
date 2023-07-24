const FadeIn = {
  FadeIn: {
    style: '@keyframes FadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }',
    duration: 0.5,
  },
  FadeInRight: {
    style:
      '@keyframes FadeInRight { 0% { opacity: 0; transform: translateX(20%); } 100% { opacity: 1; transform: translateX(0); } }',
    duration: 0.5,
  },
  FadeInLeft: {
    style:
      '@keyframes FadeInLeft { 0% { opacity: 0; transform: translateX(-20%); } 100% { opacity: 1; transform: translateX(0); } }',
    duration: 0.5,
  },
  FadeInDown: {
    style:
      '@keyframes FadeInDown { 0% { opacity: 0; transform: translateY(20%); } 100% { opacity: 1; transform: translateY(0); } }',
    duration: 0.5,
  },
  FadeInUp: {
    style:
      '@keyframes FadeInUp { 0% { opacity: 0; transform: translateY(-20%); } 100% { opacity: 1; transform: translateY(0); } }',
    duration: 0.5,
  },
};

const FadeOut = {
  FadeOut: {
    style: '@keyframes FadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }',
    duration: 0.5,
  },
  FadeOutRight: {
    style:
      '@keyframes FadeOutRight { 0% { opacity: 1; transform: translateX(0%); } 100% { opacity: 0; transform: translateX(20%); } }',
    duration: 0.5,
  },
  FadeOutLeft: {
    style:
      '@keyframes FadeOutLeft { 0% { opacity: 1; transform: translateX(0%); } 100% { opacity: 0; transform: translateX(-20%); } }',
    duration: 0.5,
  },
  FadeOutDown: {
    style:
      '@keyframes FadeOutDown { 0% { opacity: 1; transform: translateY(0%); } 100% { opacity: 0; transform: translateY(20%); } }',
    duration: 0.5,
  },
  FadeOutUp: {
    style:
      '@keyframes FadeOutUp { 0% { opacity: 1; transform: translateY(0%); } 100% { opacity: 0; transform: translateY(-20%); } }',
    duration: 0.5,
  },
};

const BounceIn = {
  BounceIn: {
    style:
      '@keyframes BounceIn {0% {transform: scale(0.1);} 50% {transform: scale(1);} 70% {transform: scale(1.3);} 90% {transform: scale(0.9);} 100% {transform: scale(1);}}',
    duration: 0.5,
  },
  BounceInRight: {
    style:
      '@keyframes BounceInRight {0% {transform: translateX(1000%);} 50% {transform: translateX(0%);} 70% {transform: translateX(-5%);} 90% {transform: translateX(5%);} 100% {transform: translateX(0%);}}',
    duration: 0.5,
  },
  BounceInLeft: {
    style:
      '@keyframes BounceInLeft {0% {transform: translateX(-1000%);} 50% {transform: translateX(0%);} 70% {transform: translateX(5%);} 90% {transform: translateX(-5%);} 100% {transform: translateX(0%);}}',
    duration: 0.5,
  },
  BounceInUp: {
    style:
      '@keyframes BounceInUp {0% {transform: translateY(-10000%);} 50% {transform: translateY(0%);} 80% {transform: translateY(20%);} 90% {transform: translateY(-20%);} 100% {transform: translateY(0%);}}',
    duration: 0.5,
  },
  BounceInDown: {
    style:
      '@keyframes BounceInDown {0% {transform: translateY(10000%);} 50% {transform: translateY(0%);} 80% {transform: translateY(-20%);} 90% {transform: translateY(20%);} 100% {transform: translateY(0%);}}',
    duration: 0.5,
  },
};

const BounceOut = {
  BounceOut: {
    style:
      '@keyframes BounceOut {0% {transform: scale(1);} 10% {transform: scale(0.9);} 30% {transform: scale(1.3);} 50% {transform: scale(1);} 100% {transform: scale(0.1);}}',
    duration: 0.5,
  },
  BounceOutRight: {
    style:
      '@keyframes BounceOutRight {0% {transform: translateX(0%);} 10% {transform: translateX(5%);} 30% {transform: translateX(-5%);} 50% {transform: translateX(0%);} 100% {transform: translateX(1000%);}}',
    duration: 0.5,
  },
  BounceOutLeft: {
    style:
      '@keyframes BounceOutLeft {0% {transform: translateX(0%);} 10% {transform: translateX(-5%);} 30% {transform: translateX(5%);} 50% {transform: translateX(0%);} 100% {transform: translateX(-1000%);}}',
    duration: 0.5,
  },
  BounceOutUp: {
    style:
      '@keyframes BounceOutUp {0% {transform: translateY(0%);} 10% {transform: translateY(-20%);} 30% {transform: translateY(20%);} 50% {transform: translateY(0%);} 100% {transform: translateY(-10000%);}}',
    duration: 0.5,
  },
  BounceOutDown: {
    style:
      '@keyframes BounceOutDown {0% {transform: translateY(0%);} 10% {transform: translateY(20%);} 30% {transform: translateY(-20%);} 50% {transform: translateY(0%);} 100% {transform: translateY(10000%);}}',
    duration: 0.5,
  },
};

const FlipIn = {
  FlipInYRight: {
    style:
      '@keyframes FlipInYRight { 0% { transform: rotateY(90deg) translateX(100%); opacity: 0;} 50% {opacity: 1;} 100% { transform: rotateY(0) translateX(0);} }',
    duration: 0.5,
  },
  FlipInYLeft: {
    style:
      '@keyframes FlipInYLeft { 0% { transform: rotateY(-90deg) translateX(-100%); opacity: 0;} 50% {opacity: 1;} 100% { transform: rotateY(0) translateX(0);} }',
    duration: 0.5,
  },
  FlipInXUp: {
    style:
      '@keyframes FlipInXUp { 0% { transform: rotateX(90deg) translateY(-100%); opacity: 0;} 50% {opacity: 1;} 100% { transform: rotateX(0) translateY(0);} }',
    duration: 0.5,
  },
  FlipInXDown: {
    style:
      '@keyframes FlipInXDown { 0% { transform: rotateX(-90deg) translateY(100%); opacity: 0;} 50% {opacity: 1;} 100% { transform: rotateX(0) translateY(0);} }',
    duration: 0.5,
  },
  FlipInEasyX: {
    style:
      '@keyframes FlipInEasyX { 0% { transform: perspective(200px) rotateX(90deg)} 100% { transform: rotateX(0); } }',
    duration: 0.5,
  },
  FlipInEasyY: {
    style:
      '@keyframes FlipInEasyY { 0% { transform: rotateY(-90deg);} 100% { transform: rotateY(0deg));} }',
    duration: 0.5,
  },
};

const FlipOut = {
  FlipOutYRight: {
    style:
      '@keyframes FlipOutYRight { 0% { transform: rotateY(0deg) translateX(0%); opacity: 1;} 50% {opacity: 0;} 100% { transform: rotateY(-90deg) translateX(100%);} }',
    duration: 0.5,
  },
  FlipOutYLeft: {
    style:
      '@keyframes FlipOutYLeft { 0% { transform: rotateY(0deg) translateX(0%); opacity: 1;} 50% {opacity: 0;} 100% { transform: rotateY(-90deg) translateX(-100%);} }',
    duration: 0.5,
  },
  FlipOutXUp: {
    style:
      '@keyframes FlipOutXUp { 0% { transform: rotateX(0deg) translateY(0%); opacity: 1;} 50% {opacity: 0;} 100% { transform: rotateX(90deg) translateY(-100%);} }',
    duration: 0.5,
  },
  FlipOutXDown: {
    style:
      '@keyframes FlipOutXDown { 0% { transform: rotateX(0deg) translateY(0%); opacity: 1;} 50% {opacity: 0;} 100% { transform: rotateX(90deg) translateY(100%);} }',
    duration: 0.5,
  },
  FlipOutEasyX: {
    style:
      '@keyframes FlipOutEasyX { 0% { transform: perspective(200px) rotateX(0deg)} 100% { transform: rotateX(90deg); } }',
    duration: 0.5,
  },
  FlipOutEasyY: {
    style:
      '@keyframes FlipOutEasyY { 0% { transform: rotateY(0deg);} 100% { transform: rotateY(-90deg);} }',
    duration: 0.5,
  },
};

const StretchIn = {
  StretchInX: {
    style:
      '@keyframes StretchInX { 0% { transform: scaleX(0);} 100% { transform: scaleX(1); } }',
    duration: 0.5,
  },
  StretchInY: {
    style:
      '@keyframes StretchInY { 0% { transform: scaleY(0);} 100% { transform: scaleY(1); } }',
    duration: 0.5,
  },
};

const StretchOut = {
  StretchOutX: {
    style:
      '@keyframes StretchOutX { 0% { transform: scaleX(1);} 100% { transform: scaleX(0); } }',
    duration: 0.5,
  },
  StretchOutY: {
    style:
      '@keyframes StretchOutY { 0% { transform: scaleY(1);} 100% { transform: scaleY(0); } }',
    duration: 0.5,
  },
};

const ZoomIn = {
  ZoomIn: {
    style:
      '@keyframes ZoomIn {0% {transform: scale(0);} 100% {transform: scale(1);}}',
    duration: 0.5,
  },
  ZoomInRotate: {
    style:
      '@keyframes ZoomInRotate {0% {transform: scale(0) rotate(45deg);} 100% {transform: scale(1) rotate(0deg);}}',
    duration: 0.5,
  },
  ZoomInRight: {
    style:
      '@keyframes ZoomInRight {0% {transform: translateX(100%) scale(0);} 100% {transform: translateX(0%) scale(1);}}',
    duration: 0.5,
  },
  ZoomInLeft: {
    style:
      '@keyframes ZoomInLeft {0% {transform: translateX(-100%) scale(0);} 100% {transform: translateX(0%) scale(1);}}',
    duration: 0.5,
  },
  ZoomInUp: {
    style:
      '@keyframes ZoomInUp {0% {transform: translateY(-10000%) scale(0);} 100% {transform: translateY(0%) scale(1);}}',
    duration: 0.5,
  },
  ZoomInDown: {
    style:
      '@keyframes ZoomInDown {0% {transform: translateY(10000%) scale(0);} 100% {transform: translateY(0%) scale(1);}}',
    duration: 0.5,
  },
  ZoomInEasyUp: {
    style:
      '@keyframes ZoomInEasyUp {0% {transform: translateY(-100%) scale(0);} 100% {transform:  translateY(0%) scale(1);}}',
    duration: 0.5,
  },
  ZoomInEasyDown: {
    style:
      '@keyframes ZoomInEasyDown {0% {transform: translateY(100%) scale(0);} 100% {transform:  translateY(0%) scale(1);}}',
    duration: 0.5,
  },
};

const ZoomOut = {
  ZoomOut: {
    style:
      '@keyframes ZoomOut {0% {transform: scale(1);} 100% {transform: scale(0);}}',
    duration: 0.5,
  },
  ZoomOutRotate: {
    style:
      '@keyframes ZoomOutRotate {0% {transform: scale(1) rotate(0deg);} 100% {transform: scale(0) rotate(45deg);}}',
    duration: 0.5,
  },
  ZoomOutRight: {
    style:
      '@keyframes ZoomOutRight {0% {transform: translateX(0%) scale(1);} 100% {transform: translateX(1000%) scale(0);}}',
    duration: 0.5,
  },
  ZoomOutLeft: {
    style:
      '@keyframes ZoomOutLeft {0% {transform: translateX(0%) scale(1);} 100% {transform: translateX(-1000%) scale(0);}}',
    duration: 0.5,
  },
  ZoomOutUp: {
    style:
      '@keyframes ZoomOutUp {0% {transform: translateY(0%) scale(1);} 100% {transform: translateY(-10000%) scale(0);}}',
    duration: 0.5,
  },
  ZoomOutDown: {
    style:
      '@keyframes ZoomOutDown {0% {transform: translateY(0%) scale(1);} 100% {transform: translateY(10000%) scale(0);}}',
    duration: 0.5,
  },
  ZoomOutEasyUp: {
    style:
      '@keyframes ZoomOutEasyUp {0% {transform: translateY(0%) scale(1);} 100% {transform:  translateY(-100%) scale(0);}}',
    duration: 0.5,
  },
  ZoomOutEasyDown: {
    style:
      '@keyframes ZoomOutEasyDown {0% {transform: translateY(0%) scale(1);} 100% {transform:  translateY(100%) scale(0);}}',
    duration: 0.5,
  },
};

const SlideIn = {
  SlideInRight: {
    style:
      '@keyframes SlideInRight {0% {transform: translateX(1000%);} 100% {transform: translateX(0%);}}',
    duration: 0.5,
  },
  SlideInLeft: {
    style:
      '@keyframes SlideInLeft {0% {transform: translateX(-1000%);} 100% {transform: translateX(0%);}}',
    duration: 0.5,
  },
  SlideInUp: {
    style:
      '@keyframes SlideInUp {0% {transform: translateY(-10000%);} 100% {transform: translateY(0%);}}',
    duration: 0.5,
  },
  SlideInDown: {
    style:
      '@keyframes SlideInDown {0% {transform: translateY(10000%);} 100% {transform: translateY(0%);}}',
    duration: 0.5,
  },
};

const SlideOut = {
  SlideOutRight: {
    style:
      '@keyframes SlideOutRight {0% {transform: translateX(0%);} 100% {transform: translateX(1000%);}}',
    duration: 0.5,
  },
  SlideOutLeft: {
    style:
      '@keyframes SlideOutLeft {0% {transform: translateX(0%);} 100% {transform: translateX(-1000%);}}',
    duration: 0.5,
  },
  SlideOutUp: {
    style:
      '@keyframes SlideOutUp {0% {transform: translateY(0%);} 100% {transform: translateY(-10000%);}}',
    duration: 0.5,
  },
  SlideOutDown: {
    style:
      '@keyframes SlideOutDown {0% {transform: translateY(0%);} 100% {transform: translateY(10000%);}}',
    duration: 0.5,
  },
};

const LightSpeedIn = {
  LightSpeedInRight: {
    style:
      '@keyframes LightSpeedInRight {0% {transform: translateX(100%) perspective(200px) rotateY(-10deg) rotateX(10deg); opacity: 0.2}}',
    duration: 0.2,
  },
  LightSpeedInLeft: {
    style:
      '@keyframes LightSpeedInLeft {0% {transform: translateX(-100%) perspective(200px) rotateY(10deg) rotateX(-10deg); opacity: 0.2}}',
    duration: 0.2,
  },
};

const LightSpeedOut = {
  LightSpeedOutRight: {
    style:
      '@keyframes LightSpeedOutRight {100% {transform: translateX(100%) perspective(200px) rotateY(-10deg) rotateX(-10deg); opacity: 0.2}}',
    duration: 0.2,
  },
  LightSpeedOutLeft: {
    style:
      '@keyframes LightSpeedOutLeft {100% {transform: translateX(-100%) perspective(200px) rotateY(10deg) rotateX(10deg); opacity: 0.2}}',
    duration: 0.2,
  },
};

const Pinwheel = {
  PinwheelIn: {
    style:
      '@keyframes PinwheelIn {0% {transform: rotate(360deg) scale(0); opacity: 0;} 100% {transform: rotate(0) scale(1); opacity: 1;}}',
    duration: 0.5,
  },
  PinwheelOut: {
    style:
      '@keyframes PinwheelOut {0% {transform: rotate(0deg) scale(1); opacity: 1;} 100% {transform: rotate(360deg) scale(0); opacity: 0;}}',
    duration: 0.5,
  },
};

const RotateIn = {
  RotateInDownLeft: {
    style:
      '@keyframes RotateInDownLeft {0% {transform: translateX(-40%) translateY(-250%) rotate(-90deg); opacity: 0;} 100% {transform: rotate(0); opacity: 1;}}',
    duration: 0.5,
  },
  RotateInDownRight: {
    style:
      '@keyframes RotateInDownRight {0% {transform: translateX(40%) translateY(-250%) rotate(90deg); opacity: 0;} 100% {transform: rotate(0); opacity: 1;}}',
    duration: 0.5,
  },
  RotateInUpLeft: {
    style:
      '@keyframes RotateInUpLeft {0% {transform: translateX(-40%) translateY(250%) rotate(90deg); opacity: 0;} 100% {transform: rotate(0); opacity: 1;}}',
    duration: 0.5,
  },
  RotateInUpRight: {
    style:
      '@keyframes RotateInUpRight {0% {transform: translateX(40%) translateY(250%) rotate(-90deg); opacity: 0;} 100% {transform: rotate(0); opacity: 1;}}',
    duration: 0.5,
  },
};

const RotateOut = {
  RotateOutDownLeft: {
    style:
      '@keyframes RotateOutDownLeft {0% {transform: rotate(0); opacity: 1;} 100% {transform: translateX(-40%) translateY(250%) rotate(90deg); opacity: 0;}}',
    duration: 0.5,
  },
  RotateOutDownRight: {
    style:
      '@keyframes RotateOutDownRight {0% {transform: rotate(0); opacity: 1;} 100% {transform: translateX(40%) translateY(250%) rotate(-90deg); opacity: 0;}}',
    duration: 0.5,
  },
  RotateOutUpLeft: {
    style:
      '@keyframes RotateOutUpLeft {0% {transform: rotate(0); opacity: 1;} 100% {transform: translateX(-40%) translateY(-250%) rotate(-90deg); opacity: 0;}}',
    duration: 0.5,
  },
  RotateOutUpRight: {
    style:
      '@keyframes RotateOutUpRight {0% {transform: rotate(0); opacity: 1;} 100% {transform: translateX(40%) translateY(-250%) rotate(90deg); opacity: 0;}}',
    duration: 0.5,
  },
};

const Roll = {
  RollInLeft: {
    style:
      '@keyframes RollInLeft {0% {transform: translateX(-100%) rotate(-180deg);} 100% {transform: translateY(0%);}}',
    duration: 0.5,
  },
  RollInRight: {
    style:
      '@keyframes RollInRight {0% {transform: translateX(100%) rotate(180deg);} 100% {transform: translateY(0%);}}',
    duration: 0.5,
  },
  RollOutLeft: {
    style:
      '@keyframes RollOutLeft {0% {transform: translateY(0%);} 100% {transform: translateX(-100%) rotate(-180deg);} }',
    duration: 0.5,
  },
  RollOutRight: {
    style:
      '@keyframes RollOutRight {0% {transform: translateY(0%);} 100% {transform: translateX(100%) rotate(180deg);}}',
    duration: 0.5,
  },
};

export const Animations = {
  ...FadeIn,
  ...FadeOut,
  ...BounceIn,
  ...BounceOut,
  ...FlipIn,
  ...FlipOut,
  ...StretchIn,
  ...StretchOut,
  ...ZoomIn,
  ...ZoomOut,
  ...SlideIn,
  ...SlideOut,
  ...LightSpeedIn,
  ...LightSpeedOut,
  ...Pinwheel,
  ...RotateIn,
  ...RotateOut,
  ...Roll,
};

export const WEB_ANIMATIONS_ID = 'webAnimationsStyle';

export type AnimationsTypes = keyof typeof Animations;
