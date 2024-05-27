'use strict';

import { Animations, AnimationsData, TransitionType } from './config';
import { convertAnimationObjectToKeyframes } from './animationParser';
import type {
  AnimationData,
  ReanimatedWebTransformProperties,
  TransitionData,
} from './animationParser';
import type { TransformsStyle } from 'react-native';
import { LinearTransition } from './transition/Linear.web';
import { SequencedTransition } from './transition/Sequenced.web';
import { FadingTransition } from './transition/Fading.web';
import { insertWebAnimation } from './domUtils';

// Translate values are passed as numbers. However, if `translate` property receives number, it will not automatically
// convert it to `px`. Therefore if we want to keep existing transform we have to add 'px' suffix to each of translate values
// that are present inside transform.
function addPxToTranslate(
  existingTransform: NonNullable<TransformsStyle['transform']>
) {
  type RNTransformProp = (typeof existingTransform)[number];

  // @ts-ignore `existingTransform` cannot be string because in that case
  // we throw error in `extractTransformFromStyle`
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

// In order to keep existing transform throughout animation, we have to add it to each of keyframe step.
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
 * @param animationName - Name of the animation to be modified (e.g. `FadeIn`).
 * @param existingTransform - Transform values that element already contains.
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

  const newTransform = addPxToTranslate(existingTransform);

  addExistingTransform(newAnimationData, newTransform);

  const keyframe = convertAnimationObjectToKeyframes(newAnimationData);

  insertWebAnimation(keyframeName, keyframe);

  return keyframeName;
}

let customKeyframeCounter = 0;

function generateNextCustomKeyframeName() {
  return `REA${customKeyframeCounter++}`;
}

/**
 * Creates transition of given type, appends it to stylesheet and returns keyframe name.
 *
 * @param transitionType - Type of transition (e.g. LINEAR).
 * @param transitionData - Object containing data for transforms (translateX, scaleX,...).
 * @returns Keyframe name that represents transition.
 */
export function TransitionGenerator(
  transitionType: TransitionType,
  transitionData: TransitionData,
  existingTransform: TransformsStyle['transform'] | undefined
) {
  const transitionKeyframeName = generateNextCustomKeyframeName();
  let transitionObject;

  switch (transitionType) {
    case TransitionType.LINEAR:
      transitionObject = LinearTransition(
        transitionKeyframeName,
        transitionData
      );
      break;
    case TransitionType.SEQUENCED:
      transitionObject = SequencedTransition(
        transitionKeyframeName,
        transitionData
      );
      break;
    case TransitionType.FADING:
      transitionObject = FadingTransition(
        transitionKeyframeName,
        transitionData
      );
      break;
  }

  if (existingTransform) {
    return createAnimationWithExistingTransform(
      '',
      existingTransform,
      transitionObject
    );
  }

  const transitionKeyframe =
    convertAnimationObjectToKeyframes(transitionObject);

  insertWebAnimation(transitionKeyframeName, transitionKeyframe);

  return transitionKeyframeName;
}
