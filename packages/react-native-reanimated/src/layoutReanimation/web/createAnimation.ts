'use strict';

import { TransitionType } from './config';
import type { KeyframeDefinitions } from './config';
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
import { JumpingTransition } from './transition/Jumping.web';
import { insertWebAnimation } from './domUtils';

type TransformType = NonNullable<TransformsStyle['transform']>;

// Translate values are passed as numbers. However, if `translate` property receives number, it will not automatically
// convert it to `px`. Therefore if we want to keep transform we have to add 'px' suffix to each of translate values
// that are present inside transform.
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function addPxToTranslate(transform: TransformType) {
  type RNTransformProp = (typeof transform)[number];

  // @ts-ignore `existingTransform` cannot be string because in that case
  // we throw error in `extractTransformFromStyle`
  const newTransform = transform.map((transformProp: RNTransformProp) => {
    const newTransformProp: ReanimatedWebTransformProperties = {};
    for (const [key, value] of Object.entries(transformProp)) {
      if (key.includes('translate') && typeof value === 'number') {
        // @ts-ignore After many trials we decided to ignore this error - it says that we cannot use 'key' to index this object.
        // Sadly it doesn't go away after using cast `key as keyof TransformProperties`.
        newTransformProp[key] = `${value}px`;
      } else {
        // @ts-ignore same as above.
        newTransformProp[key] = value;
      }
    }
    return newTransformProp;
  });

  return newTransform;
}

export function createCustomKeyFrameAnimation(
  keyframeDefinitions: KeyframeDefinitions
) {
  for (const value of Object.values(keyframeDefinitions)) {
    if (value.transform) {
      value.transform = addPxToTranslate(value.transform as TransformType);
    }
  }

  const animationData: AnimationData = {
    name: '',
    style: keyframeDefinitions,
    duration: -1,
  };

  animationData.name = generateNextCustomKeyframeName();

  const parsedKeyframe = convertAnimationObjectToKeyframes(animationData);

  insertWebAnimation(animationData.name, parsedKeyframe);

  return animationData.name;
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
  transitionData: TransitionData
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

    case TransitionType.JUMPING:
      transitionObject = JumpingTransition(
        transitionKeyframeName,
        transitionData
      );
      break;
  }

  const transitionKeyframe =
    convertAnimationObjectToKeyframes(transitionObject);

  insertWebAnimation(transitionKeyframeName, transitionKeyframe);

  return transitionKeyframeName;
}
