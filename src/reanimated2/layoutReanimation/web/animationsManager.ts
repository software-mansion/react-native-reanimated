'use strict';
import { Animations, AnimationsData, WebEasings, TransitionType } from '.';
import type {
  AnimationNames,
  WebEasingsNames,
  AnimationCallback,
  CustomConfig,
} from '.';
import { convertAnimationObjectToKeyframes } from './animationParser';
import type {
  AnimationData,
  ReanimatedWebTransformProperties,
  TransitionData,
} from './animationParser';
import type { TransformsStyle } from 'react-native';

import { ReduceMotion } from '../../commonTypes';

import { LinearTransition } from './transition/Linear.web';
import { SequencedTransition } from './transition/Sequenced.web';
import { FadingTransition } from './transition/Fading.web';
import { useReducedMotion } from '../../../reanimated2/hook/useReducedMotion';
import { insertWebAnimation } from './DOMManager';

// Translate values are passed as numbers. However, if `translate` property receives number, it will not automatically
// convert it to `px`. Therefore if we want to keep exisitng transform we have to add 'px' suffix to each of translate values
// that are present inside transform.
function addPxToTranslate(
  existingTransform: NonNullable<TransformsStyle['transform']>
) {
  type RNTransformProp = (typeof existingTransform)[number];

  if (typeof existingTransform === 'string') {
    throw new Error('[Reanimated] String transform is unsupported.');
  }

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

  return newTransform;
}

// In order to keep exisitng transform throughout animation, we have to add it to each of keyframe step.
function addExistingTransform(
  newAnimationData: AnimationData,
  newTransform: ReanimatedWebTransformProperties[]
) {
  for (const keyframeStepProperties of Object.values(newAnimationData.style)) {
    if (!keyframeStepProperties.transform) {
      // If transform doesn't exist, we add only transform that already exists
      keyframeStepProperties.transform = newTransform;
    } else {
      // We insert existing transformations before ours.
      Array.prototype.unshift.apply(
        keyframeStepProperties.transform,
        newTransform
      );
    }
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
  existingTransform: NonNullable<TransformsStyle['transform']>,
  layoutTransition?: AnimationData
) {
  let newAnimationData;

  if (layoutTransition) {
    newAnimationData = layoutTransition;
  } else {
    if (!(animationName in Animations)) {
      return '';
    }
    newAnimationData = structuredClone(AnimationsData[animationName]);
  }

  const keyframeName = generateNextCustomKeyframeName();

  newAnimationData.name = keyframeName;

  if (typeof existingTransform === 'string') {
    throw new Error('[Reanimated] String transform is currently unsupported.');
  }

  const newTransform = addPxToTranslate(existingTransform);

  addExistingTransform(newAnimationData, newTransform);

  const keyframe = convertAnimationObjectToKeyframes(newAnimationData);

  insertWebAnimation(keyframeName, keyframe);

  return keyframeName;
}

let customKeyframeCounter = 0;

export function generateNextCustomKeyframeName() {
  return `REA${customKeyframeCounter++}`;
}

export function getEasingFromConfig(config: CustomConfig): string {
  const easingName = (
    config.easingV !== undefined &&
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    config.easingV!.name in WebEasings
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        config.easingV!.name
      : 'linear'
  ) as WebEasingsNames;

  return `cubic-bezier(${WebEasings[easingName].toString()})`;
}

function getRandomDelay(maxDelay = 1000) {
  return Math.floor(Math.random() * (maxDelay + 1)) / 1000;
}

export function getDelayFromConfig(config: CustomConfig): number {
  const shouldRandomizeDelay = config.randomizeDelay;

  const delay = shouldRandomizeDelay ? getRandomDelay() : 0;

  if (!config.delayV) {
    return delay;
  }

  return shouldRandomizeDelay
    ? getRandomDelay(config.delayV)
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      config.delayV! / 1000;
}

export function getReducedMotionFromConfig(config: CustomConfig) {
  if (!config.reduceMotionV) {
    return useReducedMotion();
  }

  switch (config.reduceMotionV) {
    case ReduceMotion.Never:
      return false;
    case ReduceMotion.Always:
      return true;
    default:
      return useReducedMotion();
  }
}

export function getDurationFromConfig(
  config: CustomConfig,
  isLayoutTransition: boolean,
  animationName: AnimationNames
): number {
  const defaultDuration = isLayoutTransition
    ? 0.3
    : Animations[animationName].duration;

  return config.durationV !== undefined
    ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      config.durationV! / 1000
    : defaultDuration;
}

export function getCallbackFromConfig(config: CustomConfig): AnimationCallback {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return config.callbackV !== undefined ? config.callbackV! : null;
}

/**
 * Creates transition of given type, appends it to stylesheet and returns keyframe name.
 *
 * @param transitionType Type of transition (e.g. LINEAR).
 * @param transitionData Object containing data for transforms (translateX, scaleX,...).
 * @returns Keyframe name that represents transition.
 */
export function TransitionGenerator(
  transitionType: TransitionType,
  transitionData: TransitionData,
  existingTransform?: NonNullable<TransformsStyle['transform']>
) {
  const keyframe = generateNextCustomKeyframeName();
  let transitionObject;

  switch (transitionType) {
    case TransitionType.LINEAR:
      transitionObject = LinearTransition(keyframe, transitionData);
      break;
    case TransitionType.SEQUENCED:
      transitionObject = SequencedTransition(keyframe, transitionData);
      break;
    case TransitionType.FADING:
      transitionObject = FadingTransition(keyframe, transitionData);
      break;
  }

  if (existingTransform) {
    return createAnimationWithExistingTransform(
      '',
      existingTransform,
      transitionObject
    );
  }

  const transition = convertAnimationObjectToKeyframes(transitionObject);

  insertWebAnimation(keyframe, transition);

  return keyframe;
}
