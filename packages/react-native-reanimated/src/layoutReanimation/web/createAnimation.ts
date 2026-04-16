'use strict';

import type { TransformsStyle } from 'react-native';

import { maybeAddSuffix } from '../../common';
import { LayoutAnimationType } from '../../commonTypes';
import type {
  AnimationData,
  ReanimatedWebTransformProperties,
  TransitionData,
} from './animationParser';
import { convertAnimationObjectToKeyframes } from './animationParser';
import type { InitialValuesStyleProps, KeyframeDefinitions } from './config';
import { AnimationsData, TransitionType } from './config';
import { insertWebAnimation } from './domUtils';
import { CurvedTransition } from './transition/Curved.web';
import { EntryExitTransition } from './transition/EntryExit.web';
import { FadingTransition } from './transition/Fading.web';
import { JumpingTransition } from './transition/Jumping.web';
import { LinearTransition } from './transition/Linear.web';
import { SequencedTransition } from './transition/Sequenced.web';

type TransformType = NonNullable<TransformsStyle['transform']>;
type TransformValue = string | number;

function assignTransformRules(
  map: Map<string, TransformValue>,
  transform?: ReanimatedWebTransformProperties[]
) {
  if (!transform) {
    return;
  }

  for (const rule of transform) {
    for (const [property, value] of Object.entries(rule)) {
      map.set(property, value as TransformValue);
    }
  }
}

// Translate values are passed as numbers. However, if `translate` property receives number, it will not automatically
// convert it to `px`. Therefore if we want to keep transform we have to add 'px' suffix to each of translate values
// that are present inside transform.
//
function addPxToTransform(transform: TransformType) {
  type RNTransformProp = NonNullable<(typeof transform)[number]>;

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
  keyframeDefinitions: KeyframeDefinitions,
  animationType: LayoutAnimationType
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

  animationData.name = generateNextCustomKeyframeName(animationType);

  // Move keyframe easings one keyframe up (our LA Keyframe definition is different
  // from the CSS keyframes and expects easing to be present in the keyframe to which
  // we animate instead of the keyframe we animate from)
  const offsets = Object.keys(
    keyframeDefinitions
  ) as (keyof KeyframeDefinitions)[];

  for (let i = 1; i < offsets.length; i++) {
    const style = keyframeDefinitions[offsets[i]];
    if (style.easing) {
      keyframeDefinitions[offsets[i - 1]].easing = style.easing;
      delete style.easing;
    }
  }

  const parsedKeyframe = convertAnimationObjectToKeyframes(animationData);

  insertWebAnimation(animationData.name, parsedKeyframe);

  return animationData.name;
}

export function createAnimationWithInitialValues(
  animationName: string,
  initialValues: InitialValuesStyleProps,
  animationType: LayoutAnimationType
) {
  const animationStyle = structuredClone(AnimationsData[animationName].style);
  const firstAnimationStep = animationStyle['0'];

  const { transform, originX, originY, ...rest } = initialValues;

  const transformStyle = new Map<string, TransformValue>();
  assignTransformRules(transformStyle, firstAnimationStep.transform);

  if (transform) {
    const transformWithPx = addPxToTransform(transform as TransformType);
    assignTransformRules(transformStyle, transformWithPx);
  }

  if (originX !== undefined) {
    transformStyle.set('translateX', maybeAddSuffix(originX, 'px'));
  }

  if (originY !== undefined) {
    transformStyle.set('translateY', maybeAddSuffix(originY, 'px'));
  }

  const mergedTransform = Array.from(transformStyle, ([property, value]) => ({
    [property]: value,
  }));

  if (transformStyle.size) {
    firstAnimationStep.transform = mergedTransform;
  }

  animationStyle['0'] = {
    ...animationStyle['0'],
    ...rest,
  };

  // TODO: Maybe we can extract the logic below into separate function
  const keyframeName = generateNextCustomKeyframeName(animationType);

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

const ANIMATION_TYPE_STRINGS: Partial<Record<LayoutAnimationType, string>> = {
  [LayoutAnimationType.ENTERING]: 'ENTERING',
  [LayoutAnimationType.EXITING]: 'EXITING',
  [LayoutAnimationType.LAYOUT]: 'LAYOUT',
};

function generateNextCustomKeyframeName(animationType: LayoutAnimationType) {
  return `REA-${ANIMATION_TYPE_STRINGS[animationType] ?? ''}-${customKeyframeCounter++}`;
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
  const transitionKeyframeName = generateNextCustomKeyframeName(
    LayoutAnimationType.LAYOUT
  );
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
      dummyTransitionKeyframeName = generateNextCustomKeyframeName(
        LayoutAnimationType.LAYOUT
      );

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
