'use strict';

import { AnimationsData, TransitionType } from './config';
import type { InitialValuesStyleProps, KeyframeDefinitions } from './config';
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
import { CurvedTransition } from './transition/Curved.web';
import { EntryExitTransition } from './transition/EntryExit.web';

type TransformType = NonNullable<TransformsStyle['transform']>;

// Translate values are passed as numbers. However, if `translate` property receives number, it will not automatically
// convert it to `px`. Therefore if we want to keep transform we have to add 'px' suffix to each of translate values
// that are present inside transform.
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function addPxToTransform(transform: TransformType) {
  type RNTransformProp = (typeof transform)[number];

  // @ts-ignore `existingTransform` cannot be string because in that case
  // we throw error in `extractTransformFromStyle`
  const newTransform = transform.map((transformProp: RNTransformProp) => {
    const newTransformProp: ReanimatedWebTransformProperties = {};
    for (const [key, value] of Object.entries(transformProp)) {
      if (
        (key.includes('translate') || key.includes('perspective')) &&
        typeof value === 'number'
      ) {
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
      value.transform = addPxToTransform(value.transform as TransformType);
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

export function createAnimationWithInitialValues(
  animationName: string,
  initialValues: InitialValuesStyleProps
) {
  const animationStyle = structuredClone(AnimationsData[animationName].style);
  const firstAnimationStep = animationStyle['0'];

  const { transform, ...rest } = initialValues;
  const transformWithPx = addPxToTransform(transform as TransformType);

  if (transform) {
    // If there was no predefined transform, we can simply assign transform from `initialValues`.
    if (!firstAnimationStep.transform) {
      firstAnimationStep.transform = transformWithPx;
    } else {
      // Othwerwise we have to merge predefined transform with the one provided in `initialValues`.
      // To do that, we create `Map` that will contain final transform.
      const transformStyle = new Map<string, any>();

      // First we assign all of the predefined rules
      for (const rule of firstAnimationStep.transform) {
        // In most cases there will be just one iteration
        for (const [property, value] of Object.entries(rule)) {
          transformStyle.set(property, value);
        }
      }

      // Then we either add new rule, or override one that already exists.
      for (const rule of transformWithPx) {
        for (const [property, value] of Object.entries(rule)) {
          transformStyle.set(property, value);
        }
      }

      // Finally, we convert `Map` with final transform back into array of objects.
      firstAnimationStep.transform = Array.from(
        transformStyle,
        ([property, value]) => ({
          [property]: value,
        })
      );
    }
  }

  animationStyle['0'] = {
    ...animationStyle['0'],
    ...rest,
  };

  // TODO: Maybe we can extract the logic below into separate function
  const keyframeName = generateNextCustomKeyframeName();

  const animationObject: AnimationData = {
    name: keyframeName,
    style: animationStyle,
    duration: AnimationsData[animationName].duration,
  };

  const keyframe = convertAnimationObjectToKeyframes(animationObject);

  insertWebAnimation(keyframeName, keyframe);

  return keyframeName;
}

let customKeyframeCounter = 0;

function generateNextCustomKeyframeName() {
  return `REA${customKeyframeCounter++}`;
}

/**
 * Creates transition of given type, appends it to stylesheet and returns
 * keyframe name.
 *
 * @param transitionType - Type of transition (e.g. LINEAR).
 * @param transitionData - Object containing data for transforms (translateX,
 *   scaleX,...).
 * @returns Keyframe name that represents transition.
 */
export function TransitionGenerator(
  transitionType: TransitionType,
  transitionData: TransitionData
) {
  const transitionKeyframeName = generateNextCustomKeyframeName();
  let dummyTransitionKeyframeName;

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

    // Here code block with {} is necessary because of eslint
    case TransitionType.CURVED: {
      dummyTransitionKeyframeName = generateNextCustomKeyframeName();

      const { firstKeyframeObj, secondKeyframeObj } = CurvedTransition(
        transitionKeyframeName,
        dummyTransitionKeyframeName,
        transitionData
      );

      transitionObject = firstKeyframeObj;

      const dummyKeyframe =
        convertAnimationObjectToKeyframes(secondKeyframeObj);

      insertWebAnimation(dummyTransitionKeyframeName, dummyKeyframe);

      break;
    }
    case TransitionType.ENTRY_EXIT:
      transitionObject = EntryExitTransition(
        transitionKeyframeName,
        transitionData
      );
      break;
  }

  const transitionKeyframe =
    convertAnimationObjectToKeyframes(transitionObject);

  insertWebAnimation(transitionKeyframeName, transitionKeyframe);

  return { transitionKeyframeName, dummyTransitionKeyframeName };
}
