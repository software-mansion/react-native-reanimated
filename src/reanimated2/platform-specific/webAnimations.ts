import { Animations, AnimationsData, WebEasings } from './webAnimationsData';

import type { AnimationsTypes } from './webAnimationsData';

import {
  parseAnimationObjectToKeyframe,
  type TransformProperties,
} from './webAnimationsData/animationParser';

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

export function getEasingFromConfig(config: any): string {
  const hasEasing = Object.prototype.hasOwnProperty.call(config, 'easingV');

  const easingName =
    hasEasing && config.easingV.name in WebEasings
      ? config.easingV.name
      : 'linear';

  return `cubic-bezier(${WebEasings[easingName].toString()})`;
}

export function getDelayFromConfig(config: any): number {
  const hasDelay = Object.prototype.hasOwnProperty.call(config, 'delayV');
  const shouldRandomizeDelay = config.randomizeDelay;

  let delay = shouldRandomizeDelay ? getRandomDelay() : 0;

  if (hasDelay) {
    delay = shouldRandomizeDelay
      ? getRandomDelay(config.delayV)
      : config.delayV / 1000;
  }

  return delay;
}

export function getDurationFromConfig(
  config: any,
  isLayoutTransition: boolean,
  animationName: AnimationsTypes
): number {
  const hasDuration = Object.prototype.hasOwnProperty.call(config, 'durationV');
  const defaultDuration = isLayoutTransition
    ? 0.3
    : Animations[animationName].duration;

  return hasDuration ? config.durationV / 1000 : defaultDuration;
}

export function getRandomDelay(maxDelay = 1000): number {
  return Math.floor(Math.random() * (maxDelay + 1)) / 1000;
}

export function areDOMRectsEqual(r1: DOMRect, r2: DOMRect): boolean {
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
}

export function handleEnteringAnimation(
  element: HTMLElement,
  animationConfig: AnimationConfig
): void {
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
): void {
  const parent = element.offsetParent;
  const tmpElement = element.cloneNode() as HTMLElement;

  // After cloning the element, we want to move all children from original element to its clone. This is because original element
  // will be unmounted, therefore when this code executes in child component, parent will be either empty or removed soon.
  // Using element.cloneNode(true) doesn't solve the problem, because it creates copy of children and we won't be able to set their animations
  //
  // This loop works because appendChild() moves element into its new parent instead of copying it and then inserting copy into new parent
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

  tmpElement.onanimationend = () =>
    parent?.contains(tmpElement) ? parent.removeChild(tmpElement) : null;
}
