import {
  AnimationData,
  AnimationsData,
  TransformProperties,
  WebEasings,
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

export function createAnimationWithTransform(
  animationName: string,
  transform: any
): string {
  const name = generateRandomKeyframeName();
  const newAnimationData = structuredClone(AnimationsData[animationName]);

  newAnimationData.name = name;

  transform = transform.map((transformProp: TransformProperties) => {
    const transformedObj: TransformProperties = {};
    for (const [key, value] of Object.entries(transformProp)) {
      if (key.includes('translate')) {
        // @ts-ignore After many trials we decided to ignore this error - it says that we cannot use 'key' to index this object.
        // Sadly it doesn't go away after using cast `key as keyof TransformProperties`
        transformedObj[key] = `${value}px`;
      } else {
        // @ts-ignore same as above
        transformedObj[key] = value;
      }
    }
    return transformedObj;
  });

  for (const value of Object.values(newAnimationData.style)) {
    if (!value.transform) {
      value.transform = transform;
    } else {
      Array.prototype.unshift.apply(value.transform, transform);
    }
  }

  const keyFrame = parseObjectStyleToString(newAnimationData);

  const styleTag = document.getElementById(
    WEB_ANIMATIONS_ID
  ) as HTMLStyleElement;
  styleTag.sheet?.insertRule(keyFrame);

  console.log(keyFrame);
  return name;
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
    style: parseObjectStyleToString(AnimationsData.FadeIn),
    duration: AnimationsData.FadeIn.duration,
  },
  FadeInRight: {
    style: parseObjectStyleToString(AnimationsData.FadeInRight),
    duration: AnimationsData.FadeInRight.duration,
  },
  FadeInLeft: {
    style: parseObjectStyleToString(AnimationsData.FadeInLeft),
    duration: AnimationsData.FadeInLeft.duration,
  },
  FadeInUp: {
    style: parseObjectStyleToString(AnimationsData.FadeInUp),
    duration: AnimationsData.FadeInUp.duration,
  },
  FadeInDown: {
    style: parseObjectStyleToString(AnimationsData.FadeInDown),
    duration: AnimationsData.FadeInDown.duration,
  },
};

const FadeOut = {
  FadeOut: {
    style: parseObjectStyleToString(AnimationsData.FadeOut),
    duration: AnimationsData.FadeOut.duration,
  },
  FadeOutRight: {
    style: parseObjectStyleToString(AnimationsData.FadeOutRight),
    duration: AnimationsData.FadeOutRight.duration,
  },
  FadeOutLeft: {
    style: parseObjectStyleToString(AnimationsData.FadeOutLeft),
    duration: AnimationsData.FadeOutLeft.duration,
  },
  FadeOutUp: {
    style: parseObjectStyleToString(AnimationsData.FadeOutUp),
    duration: AnimationsData.FadeOutUp.duration,
  },
  FadeOutDown: {
    style: parseObjectStyleToString(AnimationsData.FadeOutDown),
    duration: AnimationsData.FadeOutDown.duration,
  },
};

const BounceIn = {
  BounceIn: {
    style: parseObjectStyleToString(AnimationsData.BounceIn),
    duration: AnimationsData.BounceIn.duration,
  },
  BounceInRight: {
    style: parseObjectStyleToString(AnimationsData.BounceInRight),
    duration: AnimationsData.BounceInRight.duration,
  },
  BounceInLeft: {
    style: parseObjectStyleToString(AnimationsData.BounceInLeft),
    duration: AnimationsData.BounceInLeft.duration,
  },
  BounceInUp: {
    style: parseObjectStyleToString(AnimationsData.BounceInUp),
    duration: AnimationsData.BounceInUp.duration,
  },
  BounceInDown: {
    style: parseObjectStyleToString(AnimationsData.BounceInDown),
    duration: AnimationsData.BounceInDown.duration,
  },
};

const BounceOut = {
  BounceOut: {
    style: parseObjectStyleToString(AnimationsData.BounceOut),
    duration: AnimationsData.BounceOut.duration,
  },
  BounceOutRight: {
    style: parseObjectStyleToString(AnimationsData.BounceOutRight),
    duration: AnimationsData.BounceOutRight.duration,
  },
  BounceOutLeft: {
    style: parseObjectStyleToString(AnimationsData.BounceOutLeft),
    duration: AnimationsData.BounceOutLeft.duration,
  },
  BounceOutUp: {
    style: parseObjectStyleToString(AnimationsData.BounceOutUp),
    duration: AnimationsData.BounceOutUp.duration,
  },
  BounceOutDown: {
    style: parseObjectStyleToString(AnimationsData.BounceOutDown),
    duration: AnimationsData.BounceOutDown.duration,
  },
};

const FlipIn = {
  FlipInYRight: {
    style: parseObjectStyleToString(AnimationsData.FlipInYRight),
    duration: AnimationsData.FlipInYRight.duration,
  },
  FlipInYLeft: {
    style: parseObjectStyleToString(AnimationsData.FlipInYLeft),
    duration: AnimationsData.FlipInYLeft.duration,
  },
  FlipInXUp: {
    style: parseObjectStyleToString(AnimationsData.FlipInXUp),
    duration: AnimationsData.FlipInXUp.duration,
  },
  FlipInXDown: {
    style: parseObjectStyleToString(AnimationsData.FlipInXDown),
    duration: AnimationsData.FlipInXDown.duration,
  },
  FlipInEasyX: {
    style: parseObjectStyleToString(AnimationsData.FlipInEasyX),
    duration: AnimationsData.FlipInEasyX.duration,
  },
  FlipInEasyY: {
    style: parseObjectStyleToString(AnimationsData.FlipInEasyY),
    duration: AnimationsData.FlipInEasyY.duration,
  },
};

const FlipOut = {
  FlipOutYRight: {
    style: parseObjectStyleToString(AnimationsData.FlipOutYRight),
    duration: AnimationsData.FlipOutYRight.duration,
  },
  FlipOutYLeft: {
    style: parseObjectStyleToString(AnimationsData.FlipOutYLeft),
    duration: AnimationsData.FlipOutYLeft.duration,
  },
  FlipOutXUp: {
    style: parseObjectStyleToString(AnimationsData.FlipOutXUp),
    duration: AnimationsData.FlipOutXUp.duration,
  },
  FlipOutXDown: {
    style: parseObjectStyleToString(AnimationsData.FlipOutXDown),
    duration: AnimationsData.FlipOutXDown.duration,
  },
  FlipOutEasyX: {
    style: parseObjectStyleToString(AnimationsData.FlipOutEasyX),
    duration: AnimationsData.FlipOutEasyX.duration,
  },
  FlipOutEasyY: {
    style: parseObjectStyleToString(AnimationsData.FlipOutEasyY),
    duration: AnimationsData.FlipOutEasyY.duration,
  },
};

const StretchIn = {
  StretchInX: {
    style: parseObjectStyleToString(AnimationsData.StretchInX),
    duration: AnimationsData.StretchInX.duration,
  },
  StretchInY: {
    style: parseObjectStyleToString(AnimationsData.StretchInY),
    duration: AnimationsData.StretchInY.duration,
  },
};

const StretchOut = {
  StretchOutX: {
    style: parseObjectStyleToString(AnimationsData.StretchOutX),
    duration: AnimationsData.StretchOutX.duration,
  },
  StretchOutY: {
    style: parseObjectStyleToString(AnimationsData.StretchOutY),
    duration: AnimationsData.StretchOutY.duration,
  },
};

const ZoomIn = {
  ZoomIn: {
    style: parseObjectStyleToString(AnimationsData.ZoomIn),
    duration: AnimationsData.ZoomIn.duration,
  },
  ZoomInRotate: {
    style: parseObjectStyleToString(AnimationsData.ZoomInRotate),
    duration: AnimationsData.ZoomInRotate.duration,
  },
  ZoomInRight: {
    style: parseObjectStyleToString(AnimationsData.ZoomInRight),
    duration: AnimationsData.ZoomInRight.duration,
  },
  ZoomInLeft: {
    style: parseObjectStyleToString(AnimationsData.ZoomInLeft),
    duration: AnimationsData.ZoomInLeft.duration,
  },
  ZoomInUp: {
    style: parseObjectStyleToString(AnimationsData.ZoomInUp),
    duration: AnimationsData.ZoomInUp.duration,
  },
  ZoomInDown: {
    style: parseObjectStyleToString(AnimationsData.ZoomInDown),
    duration: AnimationsData.ZoomInDown.duration,
  },
  ZoomInEasyUp: {
    style: parseObjectStyleToString(AnimationsData.ZoomInEasyUp),
    duration: AnimationsData.ZoomInEasyUp.duration,
  },
  ZoomInEasyDown: {
    style: parseObjectStyleToString(AnimationsData.ZoomInEasyDown),
    duration: AnimationsData.ZoomInEasyDown.duration,
  },
};

const ZoomOut = {
  ZoomOut: {
    style: parseObjectStyleToString(AnimationsData.ZoomOut),
    duration: AnimationsData.ZoomOut.duration,
  },
  ZoomOutRotate: {
    style: parseObjectStyleToString(AnimationsData.ZoomOutRotate),
    duration: AnimationsData.ZoomOutRotate.duration,
  },
  ZoomOutRight: {
    style: parseObjectStyleToString(AnimationsData.ZoomOutRight),
    duration: AnimationsData.ZoomOutRight.duration,
  },
  ZoomOutLeft: {
    style: parseObjectStyleToString(AnimationsData.ZoomOutLeft),
    duration: AnimationsData.ZoomOutLeft.duration,
  },
  ZoomOutUp: {
    style: parseObjectStyleToString(AnimationsData.ZoomOutUp),
    duration: AnimationsData.ZoomOutUp.duration,
  },
  ZoomOutDown: {
    style: parseObjectStyleToString(AnimationsData.ZoomOutDown),
    duration: AnimationsData.ZoomOutDown.duration,
  },
  ZoomOutEasyUp: {
    style: parseObjectStyleToString(AnimationsData.ZoomOutEasyUp),
    duration: AnimationsData.ZoomOutEasyUp.duration,
  },
  ZoomOutEasyDown: {
    style: parseObjectStyleToString(AnimationsData.ZoomOutEasyDown),
    duration: AnimationsData.ZoomOutEasyDown.duration,
  },
};

const SlideIn = {
  SlideInRight: {
    style: parseObjectStyleToString(AnimationsData.SlideInRight),
    duration: AnimationsData.SlideInRight.duration,
  },
  SlideInLeft: {
    style: parseObjectStyleToString(AnimationsData.SlideInLeft),
    duration: AnimationsData.SlideInLeft.duration,
  },
  SlideInUp: {
    style: parseObjectStyleToString(AnimationsData.SlideInUp),
    duration: AnimationsData.SlideInUp.duration,
  },
  SlideInDown: {
    style: parseObjectStyleToString(AnimationsData.SlideInDown),
    duration: AnimationsData.SlideInDown.duration,
  },
};

const SlideOut = {
  SlideOutRight: {
    style: parseObjectStyleToString(AnimationsData.SlideOutRight),
    duration: AnimationsData.SlideOutRight.duration,
  },
  SlideOutLeft: {
    style: parseObjectStyleToString(AnimationsData.SlideOutLeft),
    duration: AnimationsData.SlideOutLeft.duration,
  },
  SlideOutUp: {
    style: parseObjectStyleToString(AnimationsData.SlideOutUp),
    duration: AnimationsData.SlideOutUp.duration,
  },
  SlideOutDown: {
    style: parseObjectStyleToString(AnimationsData.SlideOutDown),
    duration: AnimationsData.SlideOutDown.duration,
  },
};

const LightSpeedIn = {
  LightSpeedInRight: {
    style: parseObjectStyleToString(AnimationsData.LightSpeedInRight),
    duration: AnimationsData.LightSpeedInRight.duration,
  },
  LightSpeedInLeft: {
    style: parseObjectStyleToString(AnimationsData.LightSpeedInLeft),
    duration: AnimationsData.LightSpeedInLeft.duration,
  },
};

const LightSpeedOut = {
  LightSpeedOutRight: {
    style: parseObjectStyleToString(AnimationsData.LightSpeedOutRight),
    duration: AnimationsData.LightSpeedOutRight.duration,
  },
  LightSpeedOutLeft: {
    style: parseObjectStyleToString(AnimationsData.LightSpeedOutLeft),
    duration: AnimationsData.LightSpeedOutLeft.duration,
  },
};

const Pinwheel = {
  PinwheelIn: {
    style: parseObjectStyleToString(AnimationsData.PinwheelIn),
    duration: AnimationsData.PinwheelIn.duration,
  },
  PinwheelOut: {
    style: parseObjectStyleToString(AnimationsData.PinwheelOut),
    duration: AnimationsData.PinwheelOut.duration,
  },
};

const RotateIn = {
  RotateInDownLeft: {
    style: parseObjectStyleToString(AnimationsData.RotateInDownLeft),
    duration: AnimationsData.RotateInDownLeft.duration,
  },
  RotateInDownRight: {
    style: parseObjectStyleToString(AnimationsData.RotateInDownRight),
    duration: AnimationsData.RotateInDownRight.duration,
  },
  RotateInUpLeft: {
    style: parseObjectStyleToString(AnimationsData.RotateInUpLeft),
    duration: AnimationsData.RotateInUpLeft.duration,
  },
  RotateInUpRight: {
    style: parseObjectStyleToString(AnimationsData.RotateInUpRight),
    duration: AnimationsData.RotateInUpRight.duration,
  },
};

const RotateOut = {
  RotateOutDownLeft: {
    style: parseObjectStyleToString(AnimationsData.RotateOutDownLeft),
    duration: AnimationsData.RotateOutDownLeft.duration,
  },
  RotateOutDownRight: {
    style: parseObjectStyleToString(AnimationsData.RotateOutDownRight),
    duration: AnimationsData.RotateOutDownRight.duration,
  },
  RotateOutUpLeft: {
    style: parseObjectStyleToString(AnimationsData.RotateOutUpLeft),
    duration: AnimationsData.RotateOutUpLeft.duration,
  },
  RotateOutUpRight: {
    style: parseObjectStyleToString(AnimationsData.RotateOutUpRight),
    duration: AnimationsData.RotateOutUpRight.duration,
  },
};

const Roll = {
  RollInLeft: {
    style: parseObjectStyleToString(AnimationsData.RollInLeft),
    duration: AnimationsData.RollInLeft.duration,
  },
  RollInRight: {
    style: parseObjectStyleToString(AnimationsData.RollInRight),
    duration: AnimationsData.RollInRight.duration,
  },
  RollOutLeft: {
    style: parseObjectStyleToString(AnimationsData.RollOutLeft),
    duration: AnimationsData.RollOutLeft.duration,
  },
  RollOutRight: {
    style: parseObjectStyleToString(AnimationsData.RollOutRight),
    duration: AnimationsData.RollOutRight.duration,
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
                  0% {
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

  // TODO: Change proportions
  return `@keyframes ${name} {
                0% {
                  transform: translateX(${dx}px) translateY(${dy}px) scale(${scaleX}, ${scaleY});
                }
                50% {
                  transform: ${translate} scale(${scaleValue});
                }
                100% {
                  transform: translateX(0) translateY(0) scale(1,1);
                }
              }`;
}

function FadingTransition(name: string, transitionConfig: TransitionConfig) {
  const { dx, dy, scaleX, scaleY } = transitionConfig;

  return `@keyframes ${name} {
                0% {
                  opacity: 1;
                  transform: translateX(${dx}px) translateY(${dy}px) scale(${scaleX}, ${scaleY});
                }
                20%{
                  opacity: 0;
                  transform: translateX(${dx}px) translateY(${dy}px) scale(${scaleX}, ${scaleY});
                }
                60% {
                  opacity: 0;
                  transform: translateX(0) translateY(0) scale(1,1);
                }
                100% {
                  opacity: 1;
                  transform: translateX(0) translateY(0) scale(1,1);
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
export type LayoutTransitionsTypes = keyof typeof AnimationsData;
