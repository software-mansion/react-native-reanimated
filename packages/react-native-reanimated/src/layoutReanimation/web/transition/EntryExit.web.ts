'use strict';
import type {
  AnimationData,
  AnimationStyle,
  TransitionData,
} from '../animationParser';
import { AnimationsData } from '../config';

const ExitingFinalStep = 49;
const EnteringStartStep = 50;

type TransformData = {
  translateX: string;
  translateY: string;
  scale: string;
};

// Layout transitions on web work in "reverse order". It means that the element is rendered at its destination and then, at the beginning of the animation,
// we move it back to its starting point.
// This function is responsible for adding transition data into beginning of each keyframe step.
// Doing so will ensure that the element will perform animation from correct position.
function addTransformToKeepPosition(
  keyframeStyleData: Record<number, AnimationStyle>,
  animationStyle: Record<number, AnimationStyle>,
  transformData: TransformData,
  isExiting: boolean
) {
  for (const [timestamp, styles] of Object.entries(animationStyle)) {
    if (styles.transform !== undefined) {
      // If transform was defined, we want to put transform from transition at the beginning, hence we use `unshift`
      styles.transform.unshift(transformData);
    } else {
      // If transform was undefined, we simply add transform from transition
      styles.transform = [transformData];
    }

    const newTimestamp = parseInt(timestamp) / 2;
    const index = isExiting
      ? Math.min(newTimestamp, ExitingFinalStep) // We want to squeeze exiting animation from range 0-100 into range 0-49
      : newTimestamp + EnteringStartStep; // Entering animation will start from 50 and go up to 100

    keyframeStyleData[`${index}`] = styles;
  }
}

export function EntryExitTransition(
  name: string,
  transitionData: TransitionData
) {
  const exitingAnimationData = structuredClone(
    AnimationsData[transitionData.exiting]
  );
  const enteringAnimationData = structuredClone(
    AnimationsData[transitionData.entering]
  );

  const additionalExitingData: TransformData = {
    translateX: `${transitionData.translateX}px`,
    translateY: `${transitionData.translateY}px`,
    scale: `${transitionData.scaleX},${transitionData.scaleY}`,
  };

  const additionalEnteringData: TransformData = {
    translateX: `0px`,
    translateY: `0px`,
    scale: `1,1`,
  };

  const keyframeData: AnimationData = {
    name,
    style: {},
    duration: 300,
  };

  addTransformToKeepPosition(
    keyframeData.style,
    exitingAnimationData.style,
    additionalExitingData,
    true
  );

  addTransformToKeepPosition(
    keyframeData.style,
    enteringAnimationData.style,
    additionalEnteringData,
    false
  );

  return keyframeData;
}
