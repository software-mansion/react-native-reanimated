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
  LayoutTransitionsData,
} from './webAnimationsData';

export function insertWebAnimations(): void {
  if (document.getElementById(WEB_ANIMATIONS_ID) !== null) {
    return;
  }

  const style = document.createElement('style');
  style.id = WEB_ANIMATIONS_ID;

  document.head.appendChild(style);

  for (const animationName in Animations) {
    style.sheet?.insertRule(Animations[animationName as AnimationsTypes].style);
  }
}

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

  return styleStr;
}

export function getEasing(easing: any): string {
  const easingName =
    easing && easing.name in WebEasings ? easing.name : 'linear';
  return `cubic-bezier(${WebEasings[easingName].toString()})`;
}

export function getRandomDelay(maxDelay = 1000): number {
  return Math.floor(Math.random() * (maxDelay + 1)) / 1000;
}

export function setElementAnimation(
  element: HTMLElement,
  duration: number,
  delay: number,
  animationName: string,
  easing: string
) {
  // element.style.transition = `margin ${duration}s`;
  element.style.animationName = animationName;
  element.style.animationDuration = `${duration}s`;
  element.style.animationDelay = `${delay}s`;
  element.style.animationTimingFunction = easing;
  element.style.animationFillMode = 'forwards'; // Prevents returning to base state after animation finishes
}

export function areDOMRectsEqual(r1: DOMRect, r2: DOMRect): boolean {
  return JSON.stringify(r1) === JSON.stringify(r2);
}

export function saveStyleAfterAnimation(element: HTMLElement): void {
  const elementStyle = window.getComputedStyle(element);

  const elementTransform = elementStyle.transform;
  const elementTranslate = elementStyle.translate;

  const numberPattern = /-?\d+/g;

  const matrixValues = elementTransform.match(numberPattern);
  const translateValues = elementTranslate.match(numberPattern);

  let dx = 0;
  let dy = 0;

  if (matrixValues) {
    const matrixValuesArray = matrixValues.map(Number);

    dx += matrixValuesArray[matrixValuesArray.length - 2];
    dy += matrixValuesArray[matrixValuesArray.length - 1];
  }

  if (translateValues) {
    const translateValuesArray = translateValues.map(Number);

    dx = translateValuesArray[0] ? dx + translateValuesArray[0] : dx;
    dy = translateValuesArray[1] ? dy + translateValuesArray[1] : dy;
  }

  element.style.translate = `${dx}px ${dy}px`;
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

export const LayoutTransitions = {
  LinearTransition: {
    style: 'margin 1s, top 1s, left 1s, right 1s, bottom 1s',
    duration: LayoutTransitionsData.LinearTransition.duration,
  },
  SequencedTransition: {
    style: 'margin 1s, top 1s, left 1s, right 1s, bottom 1s',
    duration: LayoutTransitionsData.SequencedTransition.duration,
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

// Transitions

function generateRandomKeyframeName() {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const length = 50;
  let keyframeName = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    keyframeName += characters[randomIndex];
  }

  return keyframeName;
}

function LinearTransition(name: string, transitionConfig: TransitionConfig) {
  const { dx, dy, scaleX, scaleY } = transitionConfig;

  return `@keyframes ${name} {
                  100% {
                    transform: translateX(${dx}px) translateY(${dy}px) scale(${scaleX},${scaleY});
                  }
                }`;
}

function SequencedTransition(name: string, transitionConfig: TransitionConfig) {
  const { dx, dy, scaleX, scaleY, reversed } = transitionConfig;

  const translate = `translate${reversed ? 'Y' : 'X'}(${reversed ? dy : dx}px)`;

  const scaleValue = reversed
    ? `1, ${scaleY.toString()}`
    : `${scaleX.toString()}, 1`;

  return `@keyframes ${name} {
                50% {
                  transform: ${translate} scale(${scaleValue});
                }
                100% {
                  transform: translateX(${dx}px) translateY(${dy}px) scale(${scaleX}, ${scaleY});
                }
              }`;
}

function FadingTransition(name: string, transitionConfig: TransitionConfig) {
  const { dx, dy, scaleX, scaleY } = transitionConfig;

  return `@keyframes ${name} {
                20% {
                  opacity: 0;
                  transform: translateX(0) translateY(0);
                }
                80% {
                  opacity: 0;
                  transform: translateX(${dx}px) translateY(${dy}px) scale(${scaleX}, ${scaleY});
                }
                100% {
                  opacity: 1;
                  transform: translateX(${dx}px) translateY(${dy}px) scale(${scaleX}, ${scaleY});
                }
              }`;
}

export enum TransitionType {
  LINEAR,
  SEQUENCED,
  FADING,
}

export interface TransitionConfig {
  dx: number;
  dy: number;
  scaleX: number;
  scaleY: number;
  reversed?: boolean;
}

export function TransitionGenerator(
  transitionType: TransitionType,
  transitionConfig: TransitionConfig
) {
  const name = generateRandomKeyframeName();
  let transition;

  switch (transitionType) {
    case TransitionType.LINEAR:
      transition = LinearTransition(name, transitionConfig);
      break;
    case TransitionType.SEQUENCED:
      transition = SequencedTransition(name, transitionConfig);
      break;
    case TransitionType.FADING:
      transition = FadingTransition(name, transitionConfig);
      break;
  }

  const styleTag = document.getElementById(
    WEB_ANIMATIONS_ID
  ) as HTMLStyleElement;
  styleTag.sheet?.insertRule(transition);

  return name;
}

export const WEB_ANIMATIONS_ID = 'webAnimationsStyle';

export type AnimationsTypes = keyof typeof Animations;
export type LayoutTransitionsTypes = keyof typeof LayoutTransitions;
