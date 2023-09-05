import { Animations, AnimationsData, WebEasings } from './webAnimationsData';
import type { AnimationNames, WebEasingsNames } from './webAnimationsData';
import { parseAnimationObjectToKeyframe } from './animationParser';
import type { ReanimatedWebTransformProperties } from './animationParser';
import type { TransformsStyle } from 'react-native';
import type {
  BaseAnimationBuilder,
  EntryExitAnimationFunction,
  ILayoutAnimationBuilder,
} from '../layoutReanimation';

export const WEB_ANIMATIONS_ID = 'ReanimatedWebAnimationsStyle';

export interface AnimationConfig {
  animationName: string;
  duration: number;
  delay: number;
  easing: string;
  callback: (() => void) | null;
}

interface CustomConfig {
  easingV?: () => number;
  durationV?: number;
  delayV?: number;
  randomizeDelay?: boolean;
  callbackV?: () => void;
}

type ConfigType =
  | BaseAnimationBuilder
  | ILayoutAnimationBuilder
  | typeof BaseAnimationBuilder
  | EntryExitAnimationFunction
  | Keyframe
  | CustomConfig;

/**
 *  Creates `HTMLStyleElement`, inserts it into DOM and then inserts CSS rules into the stylesheet.
 *  If style element already exists, nothing happens.
 */
export function insertWebAnimations() {
  if (document.getElementById(WEB_ANIMATIONS_ID) !== null) {
    return;
  }

  const style = document.createElement('style');
  style.id = WEB_ANIMATIONS_ID;

  style.onload = () => {
    if (!style.sheet) {
      console.error(
        '[Reanimated] Failed to create layout animations stylesheet'
      );
      return;
    }

    for (const animationName in Animations) {
      style.sheet.insertRule(Animations[animationName as AnimationNames].style);
    }
  };

  document.head.appendChild(style);
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
  existingTransform: NonNullable<TransformsStyle['transform']>
) {
  if (!(animationName in Animations)) {
    return '';
  }

  const keyframeName = generateRandomKeyframeName();
  const newAnimationData = structuredClone(AnimationsData[animationName]);

  newAnimationData.name = keyframeName;

  if (typeof existingTransform === 'string') {
    throw new Error('[Reanimated] String transform is currently unsupported.');
  }

  type RNTransformProp = (typeof existingTransform)[number];

  const newTransform = existingTransform.map(
    (transformProp: RNTransformProp) => {
      const newTransformProp: ReanimatedWebTransformProperties = {};
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
      timestampProperties.transform = newTransform;
    } else {
      // We insert existing transformations before ours.
      Array.prototype.unshift.apply(
        timestampProperties.transform,
        newTransform
      );
    }
  }

  const keyframe = parseAnimationObjectToKeyframe(newAnimationData);

  const styleTag = document.getElementById(
    WEB_ANIMATIONS_ID
  ) as HTMLStyleElement;

  if (styleTag.sheet) {
    styleTag.sheet.insertRule(keyframe);
  } else {
    console.error(
      '[Reanimated] Failed to insert layout animation into CSS stylesheet'
    );
  }

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

export function getEasingFromConfig(config: ConfigType): string {
  if (!('easingV' in config)) {
    return `cubic-bezier(${WebEasings.linear.toString()})`;
  }

  config = config as CustomConfig;

  const easingName = (
    config.easingV !== undefined && config.easingV.name in WebEasings
      ? config.easingV.name
      : 'linear'
  ) as WebEasingsNames;

  return `cubic-bezier(${WebEasings[easingName].toString()})`;
}

export function getDelayFromConfig(config: ConfigType): number {
  const shouldRandomizeDelay = (config as CustomConfig).randomizeDelay;

  const delay = shouldRandomizeDelay ? getRandomDelay() : 0;

  if (!('delayV' in config)) {
    return delay;
  }

  config = config as CustomConfig;

  if (config.delayV === undefined) {
    return delay;
  }

  return shouldRandomizeDelay
    ? getRandomDelay((config as CustomConfig).delayV)
    : config.delayV / 1000;
}

export function getDurationFromConfig(
  config: ConfigType,
  isLayoutTransition: boolean,
  animationName: AnimationNames
): number {
  const defaultDuration = isLayoutTransition
    ? 0.3
    : Animations[animationName].duration;

  if (!('durationV' in config)) {
    return defaultDuration;
  }

  config = config as CustomConfig;

  return config.durationV !== undefined
    ? config.durationV / 1000
    : defaultDuration;
}

export function getCallbackFromConfig(config: ConfigType): (() => void) | null {
  if (!('callbackV' in config)) {
    return null;
  }

  config = config as CustomConfig;

  return config.callbackV !== undefined ? config.callbackV : null;
}

export function getRandomDelay(maxDelay = 1000) {
  return Math.floor(Math.random() * (maxDelay + 1)) / 1000;
}

export function areDOMRectsEqual(r1: DOMRect, r2: DOMRect) {
  return JSON.stringify(r1) === JSON.stringify(r2);
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

  element.onanimationend = () => animationConfig.callback?.();
}

export function handleEnteringAnimation(
  element: HTMLElement,
  animationConfig: AnimationConfig
) {
  const { delay } = animationConfig;

  // If `delay` === 0, value passed to `setTimeout` will be 0. However, `setTimeout` executes after given amount of time, not exactly after that time
  // Because of that, we have to immediately toggle on the component when the delay is 0.
  if (delay === 0) {
    element.style.visibility = 'initial';
  } else {
    setTimeout(() => {
      element.style.visibility = 'initial';
    }, delay * 1000);
  }

  setElementAnimation(element, animationConfig);
}

export function handleExitingAnimation(
  element: HTMLElement,
  animationConfig: AnimationConfig
) {
  const parent = element.offsetParent;
  const tmpElement = element.cloneNode() as HTMLElement;

  // After cloning the element, we want to move all children from original element to its clone. This is because original element
  // will be unmounted, therefore when this code executes in child component, parent will be either empty or removed soon.
  // Using element.cloneNode(true) doesn't solve the problem, because it creates copy of children and we won't be able to set their animations
  //
  // This loop works because appendChild() moves element into its new parent instead of copying it
  while (element.firstChild) {
    tmpElement.appendChild(element.firstChild);
  }

  setElementAnimation(tmpElement, animationConfig);
  parent?.appendChild(tmpElement);

  // We hide current element so only its copy with proper animation will be displayed
  element.style.visibility = 'hidden';

  tmpElement.style.position = 'absolute';
  tmpElement.style.top = `${element.offsetTop}px`;
  tmpElement.style.left = `${element.offsetLeft}px`;
  tmpElement.style.margin = '0px'; // tmpElement has absolute position, so margin is not necessary

  tmpElement.onanimationend = () => {
    if (parent?.contains(tmpElement)) {
      parent.removeChild(tmpElement);
    }
  };

  animationConfig.callback?.();
}
