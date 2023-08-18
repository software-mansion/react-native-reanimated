import {
  AnimationData,
  AnimationsData,
  TransformProperties,
  WebEasings,
} from './webAnimationsData';

export const WEB_ANIMATIONS_ID = 'webAnimationsStyle';

export interface AnimationConfig {
  animationName: string;
  duration: number;
  delay: number;
  easing: string;
}

/**
 *  Creates `HTMLStyleElement`, inserts it into DOM and then inserts CSS rules into the stylesheet.
 *  If style element already exists, nothing happens.
 */
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

function parseAnimationObjectToKeyframe(
  animationObject: AnimationData
): string {
  let keyframe = `@keyframes ${animationObject.name} { `;

  for (const [timestamp, style] of Object.entries(animationObject.style)) {
    keyframe += `${timestamp}% { `;

    for (const [property, values] of Object.entries(style)) {
      if (property !== 'transform') {
        keyframe += `${property}: ${values}; `;
        continue;
      }

      keyframe += `transform:`;

      values.forEach((value: TransformProperties) => {
        for (const [
          transformProperty,
          transformPropertyValue,
        ] of Object.entries(value)) {
          keyframe += ` ${transformProperty}(${transformPropertyValue})`;
        }
      });
      keyframe += `; `; // Property end
    }
    keyframe += `} `; // Timestamp end
  }
  keyframe += `} `; // Keyframe end

  return keyframe;
}

/**
 *  Modifies default animation by preserving transformations that given element already contains.
 *
 * @param animationName Name of the animation to be modified (e.g. `FadeIn`).
 * @param existingTransform Transform values that element already contains.
 * @returns Animation parsed to keyframe string.
 */
export function createAnimationWithExistingTransform(
  animationName: string,
  existingTransform: any
): string {
  if (!(animationName in Animations)) {
    return '';
  }

  const keyframeName = generateRandomKeyframeName();
  const newAnimationData = structuredClone(AnimationsData[animationName]);

  newAnimationData.name = keyframeName;

  existingTransform = existingTransform.map(
    (transformProp: TransformProperties) => {
      const newTransformProp: TransformProperties = {};
      for (const [key, value] of Object.entries(transformProp)) {
        if (key.includes('translate')) {
          // @ts-ignore After many trials we decided to ignore this error - it says that we cannot use 'key' to index this object.
          // Sadly it doesn't go away after using cast `key as keyof TransformProperties`.
          newTransformProp[key] = `${value}px`;
        } else {
          // @ts-ignore same as above.
          newTransformProp[key] = value;
        }
      }
      return newTransformProp;
    }
  );

  for (const timestampProperties of Object.values(newAnimationData.style)) {
    if (!timestampProperties.transform) {
      timestampProperties.transform = existingTransform;
    } else {
      // We insert existing transformations before ours.
      Array.prototype.unshift.apply(
        timestampProperties.transform,
        existingTransform
      );
    }
  }

  const keyframe = parseAnimationObjectToKeyframe(newAnimationData);

  const styleTag = document.getElementById(
    WEB_ANIMATIONS_ID
  ) as HTMLStyleElement;

  styleTag.sheet?.insertRule(keyframe);

  return keyframeName;
}

export function generateRandomKeyframeName() {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const length = 50;
  let keyframeName = '';

  for (let i = 0; i < length; i++) {
    keyframeName += characters[Math.floor(Math.random() * characters.length)];
  }

  return keyframeName;
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
  animationConfig: AnimationConfig
) {
  const { animationName, duration, delay, easing } = animationConfig;

  element.style.animationName = animationName;
  element.style.animationDuration = `${duration}s`;
  element.style.animationDelay = `${delay}s`;
  element.style.animationTimingFunction = easing;
  element.style.animationFillMode = 'forwards'; // Prevents returning to base state after animation finishes.
}

export function areDOMRectsEqual(r1: DOMRect, r2: DOMRect): boolean {
  return JSON.stringify(r1) === JSON.stringify(r2);
}

const FadeIn = {
  FadeIn: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FadeIn),
    duration: AnimationsData.FadeIn.duration,
  },
  FadeInRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FadeInRight),
    duration: AnimationsData.FadeInRight.duration,
  },
  FadeInLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FadeInLeft),
    duration: AnimationsData.FadeInLeft.duration,
  },
  FadeInUp: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FadeInUp),
    duration: AnimationsData.FadeInUp.duration,
  },
  FadeInDown: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FadeInDown),
    duration: AnimationsData.FadeInDown.duration,
  },
};

const FadeOut = {
  FadeOut: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FadeOut),
    duration: AnimationsData.FadeOut.duration,
  },
  FadeOutRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FadeOutRight),
    duration: AnimationsData.FadeOutRight.duration,
  },
  FadeOutLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FadeOutLeft),
    duration: AnimationsData.FadeOutLeft.duration,
  },
  FadeOutUp: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FadeOutUp),
    duration: AnimationsData.FadeOutUp.duration,
  },
  FadeOutDown: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FadeOutDown),
    duration: AnimationsData.FadeOutDown.duration,
  },
};

const BounceIn = {
  BounceIn: {
    style: parseAnimationObjectToKeyframe(AnimationsData.BounceIn),
    duration: AnimationsData.BounceIn.duration,
  },
  BounceInRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.BounceInRight),
    duration: AnimationsData.BounceInRight.duration,
  },
  BounceInLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.BounceInLeft),
    duration: AnimationsData.BounceInLeft.duration,
  },
  BounceInUp: {
    style: parseAnimationObjectToKeyframe(AnimationsData.BounceInUp),
    duration: AnimationsData.BounceInUp.duration,
  },
  BounceInDown: {
    style: parseAnimationObjectToKeyframe(AnimationsData.BounceInDown),
    duration: AnimationsData.BounceInDown.duration,
  },
};

const BounceOut = {
  BounceOut: {
    style: parseAnimationObjectToKeyframe(AnimationsData.BounceOut),
    duration: AnimationsData.BounceOut.duration,
  },
  BounceOutRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.BounceOutRight),
    duration: AnimationsData.BounceOutRight.duration,
  },
  BounceOutLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.BounceOutLeft),
    duration: AnimationsData.BounceOutLeft.duration,
  },
  BounceOutUp: {
    style: parseAnimationObjectToKeyframe(AnimationsData.BounceOutUp),
    duration: AnimationsData.BounceOutUp.duration,
  },
  BounceOutDown: {
    style: parseAnimationObjectToKeyframe(AnimationsData.BounceOutDown),
    duration: AnimationsData.BounceOutDown.duration,
  },
};

const FlipIn = {
  FlipInYRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FlipInYRight),
    duration: AnimationsData.FlipInYRight.duration,
  },
  FlipInYLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FlipInYLeft),
    duration: AnimationsData.FlipInYLeft.duration,
  },
  FlipInXUp: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FlipInXUp),
    duration: AnimationsData.FlipInXUp.duration,
  },
  FlipInXDown: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FlipInXDown),
    duration: AnimationsData.FlipInXDown.duration,
  },
  FlipInEasyX: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FlipInEasyX),
    duration: AnimationsData.FlipInEasyX.duration,
  },
  FlipInEasyY: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FlipInEasyY),
    duration: AnimationsData.FlipInEasyY.duration,
  },
};

const FlipOut = {
  FlipOutYRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FlipOutYRight),
    duration: AnimationsData.FlipOutYRight.duration,
  },
  FlipOutYLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FlipOutYLeft),
    duration: AnimationsData.FlipOutYLeft.duration,
  },
  FlipOutXUp: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FlipOutXUp),
    duration: AnimationsData.FlipOutXUp.duration,
  },
  FlipOutXDown: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FlipOutXDown),
    duration: AnimationsData.FlipOutXDown.duration,
  },
  FlipOutEasyX: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FlipOutEasyX),
    duration: AnimationsData.FlipOutEasyX.duration,
  },
  FlipOutEasyY: {
    style: parseAnimationObjectToKeyframe(AnimationsData.FlipOutEasyY),
    duration: AnimationsData.FlipOutEasyY.duration,
  },
};

const StretchIn = {
  StretchInX: {
    style: parseAnimationObjectToKeyframe(AnimationsData.StretchInX),
    duration: AnimationsData.StretchInX.duration,
  },
  StretchInY: {
    style: parseAnimationObjectToKeyframe(AnimationsData.StretchInY),
    duration: AnimationsData.StretchInY.duration,
  },
};

const StretchOut = {
  StretchOutX: {
    style: parseAnimationObjectToKeyframe(AnimationsData.StretchOutX),
    duration: AnimationsData.StretchOutX.duration,
  },
  StretchOutY: {
    style: parseAnimationObjectToKeyframe(AnimationsData.StretchOutY),
    duration: AnimationsData.StretchOutY.duration,
  },
};

const ZoomIn = {
  ZoomIn: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomIn),
    duration: AnimationsData.ZoomIn.duration,
  },
  ZoomInRotate: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomInRotate),
    duration: AnimationsData.ZoomInRotate.duration,
  },
  ZoomInRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomInRight),
    duration: AnimationsData.ZoomInRight.duration,
  },
  ZoomInLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomInLeft),
    duration: AnimationsData.ZoomInLeft.duration,
  },
  ZoomInUp: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomInUp),
    duration: AnimationsData.ZoomInUp.duration,
  },
  ZoomInDown: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomInDown),
    duration: AnimationsData.ZoomInDown.duration,
  },
  ZoomInEasyUp: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomInEasyUp),
    duration: AnimationsData.ZoomInEasyUp.duration,
  },
  ZoomInEasyDown: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomInEasyDown),
    duration: AnimationsData.ZoomInEasyDown.duration,
  },
};

const ZoomOut = {
  ZoomOut: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomOut),
    duration: AnimationsData.ZoomOut.duration,
  },
  ZoomOutRotate: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomOutRotate),
    duration: AnimationsData.ZoomOutRotate.duration,
  },
  ZoomOutRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomOutRight),
    duration: AnimationsData.ZoomOutRight.duration,
  },
  ZoomOutLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomOutLeft),
    duration: AnimationsData.ZoomOutLeft.duration,
  },
  ZoomOutUp: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomOutUp),
    duration: AnimationsData.ZoomOutUp.duration,
  },
  ZoomOutDown: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomOutDown),
    duration: AnimationsData.ZoomOutDown.duration,
  },
  ZoomOutEasyUp: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomOutEasyUp),
    duration: AnimationsData.ZoomOutEasyUp.duration,
  },
  ZoomOutEasyDown: {
    style: parseAnimationObjectToKeyframe(AnimationsData.ZoomOutEasyDown),
    duration: AnimationsData.ZoomOutEasyDown.duration,
  },
};

const SlideIn = {
  SlideInRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.SlideInRight),
    duration: AnimationsData.SlideInRight.duration,
  },
  SlideInLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.SlideInLeft),
    duration: AnimationsData.SlideInLeft.duration,
  },
  SlideInUp: {
    style: parseAnimationObjectToKeyframe(AnimationsData.SlideInUp),
    duration: AnimationsData.SlideInUp.duration,
  },
  SlideInDown: {
    style: parseAnimationObjectToKeyframe(AnimationsData.SlideInDown),
    duration: AnimationsData.SlideInDown.duration,
  },
};

const SlideOut = {
  SlideOutRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.SlideOutRight),
    duration: AnimationsData.SlideOutRight.duration,
  },
  SlideOutLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.SlideOutLeft),
    duration: AnimationsData.SlideOutLeft.duration,
  },
  SlideOutUp: {
    style: parseAnimationObjectToKeyframe(AnimationsData.SlideOutUp),
    duration: AnimationsData.SlideOutUp.duration,
  },
  SlideOutDown: {
    style: parseAnimationObjectToKeyframe(AnimationsData.SlideOutDown),
    duration: AnimationsData.SlideOutDown.duration,
  },
};

const LightSpeedIn = {
  LightSpeedInRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.LightSpeedInRight),
    duration: AnimationsData.LightSpeedInRight.duration,
  },
  LightSpeedInLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.LightSpeedInLeft),
    duration: AnimationsData.LightSpeedInLeft.duration,
  },
};

const LightSpeedOut = {
  LightSpeedOutRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.LightSpeedOutRight),
    duration: AnimationsData.LightSpeedOutRight.duration,
  },
  LightSpeedOutLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.LightSpeedOutLeft),
    duration: AnimationsData.LightSpeedOutLeft.duration,
  },
};

const Pinwheel = {
  PinwheelIn: {
    style: parseAnimationObjectToKeyframe(AnimationsData.PinwheelIn),
    duration: AnimationsData.PinwheelIn.duration,
  },
  PinwheelOut: {
    style: parseAnimationObjectToKeyframe(AnimationsData.PinwheelOut),
    duration: AnimationsData.PinwheelOut.duration,
  },
};

const RotateIn = {
  RotateInDownLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.RotateInDownLeft),
    duration: AnimationsData.RotateInDownLeft.duration,
  },
  RotateInDownRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.RotateInDownRight),
    duration: AnimationsData.RotateInDownRight.duration,
  },
  RotateInUpLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.RotateInUpLeft),
    duration: AnimationsData.RotateInUpLeft.duration,
  },
  RotateInUpRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.RotateInUpRight),
    duration: AnimationsData.RotateInUpRight.duration,
  },
};

const RotateOut = {
  RotateOutDownLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.RotateOutDownLeft),
    duration: AnimationsData.RotateOutDownLeft.duration,
  },
  RotateOutDownRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.RotateOutDownRight),
    duration: AnimationsData.RotateOutDownRight.duration,
  },
  RotateOutUpLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.RotateOutUpLeft),
    duration: AnimationsData.RotateOutUpLeft.duration,
  },
  RotateOutUpRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.RotateOutUpRight),
    duration: AnimationsData.RotateOutUpRight.duration,
  },
};

const Roll = {
  RollInLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.RollInLeft),
    duration: AnimationsData.RollInLeft.duration,
  },
  RollInRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.RollInRight),
    duration: AnimationsData.RollInRight.duration,
  },
  RollOutLeft: {
    style: parseAnimationObjectToKeyframe(AnimationsData.RollOutLeft),
    duration: AnimationsData.RollOutLeft.duration,
  },
  RollOutRight: {
    style: parseAnimationObjectToKeyframe(AnimationsData.RollOutRight),
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

export type AnimationsTypes = keyof typeof Animations;
export type LayoutTransitionsTypes = keyof typeof AnimationsData;
