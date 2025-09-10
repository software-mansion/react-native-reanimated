'use strict';

import { convertAnimationObjectToKeyframes } from "./animationParser.js";
import { AnimationsData, TransitionType } from "./config.js";
import { insertWebAnimation } from "./domUtils.js";
import { CurvedTransition } from "./transition/Curved.web.js";
import { EntryExitTransition } from "./transition/EntryExit.web.js";
import { FadingTransition } from "./transition/Fading.web.js";
import { JumpingTransition } from "./transition/Jumping.web.js";
import { LinearTransition } from "./transition/Linear.web.js";
import { SequencedTransition } from "./transition/Sequenced.web.js";
// Translate values are passed as numbers. However, if `translate` property receives number, it will not automatically
// convert it to `px`. Therefore if we want to keep transform we have to add 'px' suffix to each of translate values
// that are present inside transform.
//

function addPxToTransform(transform) {
  // @ts-ignore `existingTransform` cannot be string because in that case
  // we throw error in `extractTransformFromStyle`
  const newTransform = transform.map(transformProp => {
    const newTransformProp = {};
    for (const [key, value] of Object.entries(transformProp)) {
      if ((key.includes('translate') || key.includes('perspective')) && typeof value === 'number') {
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
export function createCustomKeyFrameAnimation(keyframeDefinitions) {
  for (const value of Object.values(keyframeDefinitions)) {
    if (value.transform) {
      value.transform = addPxToTransform(value.transform);
    }
  }
  const animationData = {
    name: '',
    style: keyframeDefinitions,
    duration: -1
  };
  animationData.name = generateNextCustomKeyframeName();

  // Move keyframe easings one keyframe up (our LA Keyframe definition is different
  // from the CSS keyframes and expects easing to be present in the keyframe to which
  // we animate instead of the keyframe we animate from)
  const offsets = Object.keys(keyframeDefinitions);
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
export function createAnimationWithInitialValues(animationName, initialValues) {
  const animationStyle = structuredClone(AnimationsData[animationName].style);
  const firstAnimationStep = animationStyle['0'];
  const {
    transform,
    ...rest
  } = initialValues;
  const transformWithPx = addPxToTransform(transform);
  if (transform) {
    // If there was no predefined transform, we can simply assign transform from `initialValues`.
    if (!firstAnimationStep.transform) {
      firstAnimationStep.transform = transformWithPx;
    } else {
      // Othwerwise we have to merge predefined transform with the one provided in `initialValues`.
      // To do that, we create `Map` that will contain final transform.
      const transformStyle = new Map();

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
      firstAnimationStep.transform = Array.from(transformStyle, ([property, value]) => ({
        [property]: value
      }));
    }
  }
  animationStyle['0'] = {
    ...animationStyle['0'],
    ...rest
  };

  // TODO: Maybe we can extract the logic below into separate function
  const keyframeName = generateNextCustomKeyframeName();
  const animationObject = {
    name: keyframeName,
    style: animationStyle,
    duration: AnimationsData[animationName].duration
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
export function TransitionGenerator(transitionType, transitionData) {
  const transitionKeyframeName = generateNextCustomKeyframeName();
  let dummyTransitionKeyframeName;
  let transitionObject;
  switch (transitionType) {
    case TransitionType.LINEAR:
      transitionObject = LinearTransition(transitionKeyframeName, transitionData);
      break;
    case TransitionType.SEQUENCED:
      transitionObject = SequencedTransition(transitionKeyframeName, transitionData);
      break;
    case TransitionType.FADING:
      transitionObject = FadingTransition(transitionKeyframeName, transitionData);
      break;
    case TransitionType.JUMPING:
      transitionObject = JumpingTransition(transitionKeyframeName, transitionData);
      break;

    // Here code block with {} is necessary because of eslint
    case TransitionType.CURVED:
      {
        dummyTransitionKeyframeName = generateNextCustomKeyframeName();
        const {
          firstKeyframeObj,
          secondKeyframeObj
        } = CurvedTransition(transitionKeyframeName, dummyTransitionKeyframeName, transitionData);
        transitionObject = firstKeyframeObj;
        const dummyKeyframe = convertAnimationObjectToKeyframes(secondKeyframeObj);
        insertWebAnimation(dummyTransitionKeyframeName, dummyKeyframe);
        break;
      }
    case TransitionType.ENTRY_EXIT:
      transitionObject = EntryExitTransition(transitionKeyframeName, transitionData);
      break;
  }
  const transitionKeyframe = convertAnimationObjectToKeyframes(transitionObject);
  insertWebAnimation(transitionKeyframeName, transitionKeyframe);
  return {
    transitionKeyframeName,
    dummyTransitionKeyframeName
  };
}
//# sourceMappingURL=createAnimation.js.map