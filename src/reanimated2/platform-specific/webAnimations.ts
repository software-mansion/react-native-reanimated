import { Easing } from '../Easing';
import {
  AnimationData,
  FadeInData,
  FadeOutData,
  BounceInData,
  BounceOutData,
  FlipInData,
  FlipOutData,
  StretchInData,
  StretchOutData,
  ZoomInData,
  ZoomOutData,
  SlideInData,
  SlideOutData,
  LightSpeedInData,
  LightSpeedOutData,
  PinwheelData,
  RotateInData,
  RotateOutData,
  RollData,
  TransformProperties,
  WebEasings,
} from './webAnimationsData';

function parseObjectStyleToString(object: AnimationData): string {
  let styleStr = `@keyframes ${object.name} { `;

  for (const [timestamp, style] of Object.entries(object.style)) {
    styleStr += `${timestamp}% { `;

    for (const [property, values] of Object.entries(style)) {
      if (property !== 'transform') {
        styleStr += `${property}: ${values}; `;
        continue;
      }

      styleStr += `transform:`;

      values.forEach((value: TransformProperties) => {
        for (const [
          transformProperty,
          transformPropertyValue,
        ] of Object.entries(value)) {
          styleStr += ` ${transformProperty}(${transformPropertyValue})`;
        }
      });
      styleStr += `; `;
    }
    styleStr += `} `;
  }
  styleStr += `} `;

  // console.log(styleStr);

  return styleStr;
}

export function getEasing(easing: any): string {
  for (const [easingName, easingFn] of Object.entries(Easing)) {
    if (easing !== easingFn) {
      continue;
    }

    return `cubic-bezier(${WebEasings[easingName].toString()})`;
  }

  return `cubic-bezier(${WebEasings.linear.toString()})`;
}

const FadeIn = {
  FadeIn: {
    style: parseObjectStyleToString(FadeInData.FadeIn),
    duration: FadeInData.FadeIn.duration,
  },
  FadeInRight: {
    style: parseObjectStyleToString(FadeInData.FadeInRight),
    duration: FadeInData.FadeInRight.duration,
  },
  FadeInLeft: {
    style: parseObjectStyleToString(FadeInData.FadeInLeft),
    duration: FadeInData.FadeInLeft.duration,
  },
  FadeInUp: {
    style: parseObjectStyleToString(FadeInData.FadeInUp),
    duration: FadeInData.FadeInUp.duration,
  },
  FadeInDown: {
    style: parseObjectStyleToString(FadeInData.FadeInDown),
    duration: FadeInData.FadeInDown.duration,
  },
};

const FadeOut = {
  FadeOut: {
    style: parseObjectStyleToString(FadeOutData.FadeOut),
    duration: FadeOutData.FadeOut.duration,
  },
  FadeOutRight: {
    style: parseObjectStyleToString(FadeOutData.FadeOutRight),
    duration: FadeOutData.FadeOutRight.duration,
  },
  FadeOutLeft: {
    style: parseObjectStyleToString(FadeOutData.FadeOutLeft),
    duration: FadeOutData.FadeOutLeft.duration,
  },
  FadeOutUp: {
    style: parseObjectStyleToString(FadeOutData.FadeOutUp),
    duration: FadeOutData.FadeOutUp.duration,
  },
  FadeOutDown: {
    style: parseObjectStyleToString(FadeOutData.FadeOutDown),
    duration: FadeOutData.FadeOutDown.duration,
  },
};

const BounceIn = {
  BounceIn: {
    style: parseObjectStyleToString(BounceInData.BounceIn),
    duration: BounceInData.BounceIn.duration,
  },
  BounceInRight: {
    style: parseObjectStyleToString(BounceInData.BounceInRight),
    duration: BounceInData.BounceInRight.duration,
  },
  BounceInLeft: {
    style: parseObjectStyleToString(BounceInData.BounceInLeft),
    duration: BounceInData.BounceInLeft.duration,
  },
  BounceInUp: {
    style: parseObjectStyleToString(BounceInData.BounceInUp),
    duration: BounceInData.BounceInUp.duration,
  },
  BounceInDown: {
    style: parseObjectStyleToString(BounceInData.BounceInDown),
    duration: BounceInData.BounceInDown.duration,
  },
};

const BounceOut = {
  BounceOut: {
    style: parseObjectStyleToString(BounceOutData.BounceOut),
    duration: BounceOutData.BounceOut.duration,
  },
  BounceOutRight: {
    style: parseObjectStyleToString(BounceOutData.BounceOutRight),
    duration: BounceOutData.BounceOutRight.duration,
  },
  BounceOutLeft: {
    style: parseObjectStyleToString(BounceOutData.BounceOutLeft),
    duration: BounceOutData.BounceOutLeft.duration,
  },
  BounceOutUp: {
    style: parseObjectStyleToString(BounceOutData.BounceOutUp),
    duration: BounceOutData.BounceOutUp.duration,
  },
  BounceOutDown: {
    style: parseObjectStyleToString(BounceOutData.BounceOutDown),
    duration: BounceOutData.BounceOutDown.duration,
  },
};

const FlipIn = {
  FlipInYRight: {
    style: parseObjectStyleToString(FlipInData.FlipInYRight),
    duration: FlipInData.FlipInYRight.duration,
  },
  FlipInYLeft: {
    style: parseObjectStyleToString(FlipInData.FlipInYLeft),
    duration: FlipInData.FlipInYLeft.duration,
  },
  FlipInXUp: {
    style: parseObjectStyleToString(FlipInData.FlipInXUp),
    duration: FlipInData.FlipInXUp.duration,
  },
  FlipInXDown: {
    style: parseObjectStyleToString(FlipInData.FlipInXDown),
    duration: FlipInData.FlipInXDown.duration,
  },
  FlipInEasyX: {
    style: parseObjectStyleToString(FlipInData.FlipInEasyX),
    duration: FlipInData.FlipInEasyX.duration,
  },
  FlipInEasyY: {
    style: parseObjectStyleToString(FlipInData.FlipInEasyY),
    duration: FlipInData.FlipInEasyY.duration,
  },
};

const FlipOut = {
  FlipOutYRight: {
    style: parseObjectStyleToString(FlipOutData.FlipOutYRight),
    duration: FlipOutData.FlipOutYRight.duration,
  },
  FlipOutYLeft: {
    style: parseObjectStyleToString(FlipOutData.FlipOutYLeft),
    duration: FlipOutData.FlipOutYLeft.duration,
  },
  FlipOutXUp: {
    style: parseObjectStyleToString(FlipOutData.FlipOutXUp),
    duration: FlipOutData.FlipOutXUp.duration,
  },
  FlipOutXDown: {
    style: parseObjectStyleToString(FlipOutData.FlipOutXDown),
    duration: FlipOutData.FlipOutXDown.duration,
  },
  FlipOutEasyX: {
    style: parseObjectStyleToString(FlipOutData.FlipOutEasyX),
    duration: FlipOutData.FlipOutEasyX.duration,
  },
  FlipOutEasyY: {
    style: parseObjectStyleToString(FlipOutData.FlipOutEasyY),
    duration: FlipOutData.FlipOutEasyY.duration,
  },
};

const StretchIn = {
  StretchInX: {
    style: parseObjectStyleToString(StretchInData.StretchInX),
    duration: StretchInData.StretchInX.duration,
  },
  StretchInY: {
    style: parseObjectStyleToString(StretchInData.StretchInY),
    duration: StretchInData.StretchInY.duration,
  },
};

const StretchOut = {
  StretchOutX: {
    style: parseObjectStyleToString(StretchOutData.StretchOutX),
    duration: StretchOutData.StretchOutX.duration,
  },
  StretchOutY: {
    style: parseObjectStyleToString(StretchOutData.StretchOutY),
    duration: StretchOutData.StretchOutY.duration,
  },
};

const ZoomIn = {
  ZoomIn: {
    style: parseObjectStyleToString(ZoomInData.ZoomIn),
    duration: ZoomInData.ZoomIn.duration,
  },
  ZoomInRotate: {
    style: parseObjectStyleToString(ZoomInData.ZoomInRotate),
    duration: ZoomInData.ZoomInRotate.duration,
  },
  ZoomInRight: {
    style: parseObjectStyleToString(ZoomInData.ZoomInRight),
    duration: ZoomInData.ZoomInRight.duration,
  },
  ZoomInLeft: {
    style: parseObjectStyleToString(ZoomInData.ZoomInLeft),
    duration: ZoomInData.ZoomInLeft.duration,
  },
  ZoomInUp: {
    style: parseObjectStyleToString(ZoomInData.ZoomInUp),
    duration: ZoomInData.ZoomInUp.duration,
  },
  ZoomInDown: {
    style: parseObjectStyleToString(ZoomInData.ZoomInDown),
    duration: ZoomInData.ZoomInDown.duration,
  },
  ZoomInEasyUp: {
    style: parseObjectStyleToString(ZoomInData.ZoomInEasyUp),
    duration: ZoomInData.ZoomInEasyUp.duration,
  },
  ZoomInEasyDown: {
    style: parseObjectStyleToString(ZoomInData.ZoomInEasyDown),
    duration: ZoomInData.ZoomInEasyDown.duration,
  },
};

const ZoomOut = {
  ZoomOut: {
    style: parseObjectStyleToString(ZoomOutData.ZoomOut),
    duration: ZoomOutData.ZoomOut.duration,
  },
  ZoomOutRotate: {
    style: parseObjectStyleToString(ZoomOutData.ZoomOutRotate),
    duration: ZoomOutData.ZoomOutRotate.duration,
  },
  ZoomOutRight: {
    style: parseObjectStyleToString(ZoomOutData.ZoomOutRight),
    duration: ZoomOutData.ZoomOutRight.duration,
  },
  ZoomOutLeft: {
    style: parseObjectStyleToString(ZoomOutData.ZoomOutLeft),
    duration: ZoomOutData.ZoomOutLeft.duration,
  },
  ZoomOutUp: {
    style: parseObjectStyleToString(ZoomOutData.ZoomOutUp),
    duration: ZoomOutData.ZoomOutUp.duration,
  },
  ZoomOutDown: {
    style: parseObjectStyleToString(ZoomOutData.ZoomOutDown),
    duration: ZoomOutData.ZoomOutDown.duration,
  },
  ZoomOutEasyUp: {
    style: parseObjectStyleToString(ZoomOutData.ZoomOutEasyUp),
    duration: ZoomOutData.ZoomOutEasyUp.duration,
  },
  ZoomOutEasyDown: {
    style: parseObjectStyleToString(ZoomOutData.ZoomOutEasyDown),
    duration: ZoomOutData.ZoomOutEasyDown.duration,
  },
};

const SlideIn = {
  SlideInRight: {
    style: parseObjectStyleToString(SlideInData.SlideInRight),
    duration: SlideInData.SlideInRight.duration,
  },
  SlideInLeft: {
    style: parseObjectStyleToString(SlideInData.SlideInLeft),
    duration: SlideInData.SlideInLeft.duration,
  },
  SlideInUp: {
    style: parseObjectStyleToString(SlideInData.SlideInUp),
    duration: SlideInData.SlideInUp.duration,
  },
  SlideInDown: {
    style: parseObjectStyleToString(SlideInData.SlideInDown),
    duration: SlideInData.SlideInDown.duration,
  },
};

const SlideOut = {
  SlideOutRight: {
    style: parseObjectStyleToString(SlideOutData.SlideOutRight),
    duration: SlideOutData.SlideOutRight.duration,
  },
  SlideOutLeft: {
    style: parseObjectStyleToString(SlideOutData.SlideOutLeft),
    duration: SlideOutData.SlideOutLeft.duration,
  },
  SlideOutUp: {
    style: parseObjectStyleToString(SlideOutData.SlideOutUp),
    duration: SlideOutData.SlideOutUp.duration,
  },
  SlideOutDown: {
    style: parseObjectStyleToString(SlideOutData.SlideOutDown),
    duration: SlideOutData.SlideOutDown.duration,
  },
};

const LightSpeedIn = {
  LightSpeedInRight: {
    style: parseObjectStyleToString(LightSpeedInData.LightSpeedInRight),
    duration: LightSpeedInData.LightSpeedInRight.duration,
  },
  LightSpeedInLeft: {
    style: parseObjectStyleToString(LightSpeedInData.LightSpeedInLeft),
    duration: LightSpeedInData.LightSpeedInLeft.duration,
  },
};

const LightSpeedOut = {
  LightSpeedOutRight: {
    style: parseObjectStyleToString(LightSpeedOutData.LightSpeedOutRight),
    duration: LightSpeedOutData.LightSpeedOutRight.duration,
  },
  LightSpeedOutLeft: {
    style: parseObjectStyleToString(LightSpeedOutData.LightSpeedOutLeft),
    duration: LightSpeedOutData.LightSpeedOutLeft.duration,
  },
};

const Pinwheel = {
  PinwheelIn: {
    style: parseObjectStyleToString(PinwheelData.PinwheelIn),
    duration: PinwheelData.PinwheelIn.duration,
  },
  PinwheelOut: {
    style: parseObjectStyleToString(PinwheelData.PinwheelOut),
    duration: PinwheelData.PinwheelOut.duration,
  },
};

const RotateIn = {
  RotateInDownLeft: {
    style: parseObjectStyleToString(RotateInData.RotateInDownLeft),
    duration: RotateInData.RotateInDownLeft.duration,
  },
  RotateInDownRight: {
    style: parseObjectStyleToString(RotateInData.RotateInDownRight),
    duration: RotateInData.RotateInDownRight.duration,
  },
  RotateInUpLeft: {
    style: parseObjectStyleToString(RotateInData.RotateInUpLeft),
    duration: RotateInData.RotateInUpLeft.duration,
  },
  RotateInUpRight: {
    style: parseObjectStyleToString(RotateInData.RotateInUpRight),
    duration: RotateInData.RotateInUpRight.duration,
  },
};

const RotateOut = {
  RotateOutDownLeft: {
    style: parseObjectStyleToString(RotateOutData.RotateOutDownLeft),
    duration: RotateOutData.RotateOutDownLeft.duration,
  },
  RotateOutDownRight: {
    style: parseObjectStyleToString(RotateOutData.RotateOutDownRight),
    duration: RotateOutData.RotateOutDownRight.duration,
  },
  RotateOutUpLeft: {
    style: parseObjectStyleToString(RotateOutData.RotateOutUpLeft),
    duration: RotateOutData.RotateOutUpLeft.duration,
  },
  RotateOutUpRight: {
    style: parseObjectStyleToString(RotateOutData.RotateOutUpRight),
    duration: RotateOutData.RotateOutUpRight.duration,
  },
};

const Roll = {
  RollInLeft: {
    style: parseObjectStyleToString(RollData.RollInLeft),
    duration: RollData.RollInLeft.duration,
  },
  RollInRight: {
    style: parseObjectStyleToString(RollData.RollInRight),
    duration: RollData.RollInRight.duration,
  },
  RollOutLeft: {
    style: parseObjectStyleToString(RollData.RollOutLeft),
    duration: RollData.RollOutLeft.duration,
  },
  RollOutRight: {
    style: parseObjectStyleToString(RollData.RollOutRight),
    duration: RollData.RollOutRight.duration,
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
