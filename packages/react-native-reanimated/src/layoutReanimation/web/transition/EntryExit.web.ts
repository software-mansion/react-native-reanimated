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
// we move it back to its starting point. In `EntryExit` transition we want `exiting` animation to start from original position.
// This function is responsible for adding transition data into beginning of each keyframe step.
// Doing so will ensure that the element will perform exiting animation from correct position.
function addTransformToKeepPosition(
  keyframeStyleData: Record<number, AnimationStyle>,
  exitingAnimationStyle: Record<number, AnimationStyle>,
  transformData: TransformData
) {
  for (const [timestamp, styles] of Object.entries(exitingAnimationStyle)) {
    if (styles.transform !== undefined) {
      // If transform was defined, we want to put transform from transition at the beginning, hence we use `unshift`
      styles.transform.unshift(transformData);
    } else {
      // If transform was undefined, we simply add transform from transition
      styles.transform = [transformData];
    }

    // Now, we want to squeeze exiting animation from range 0-100 into range 0-49 (remaining half will be used for entering animation)
    const newTimestamp = parseInt(timestamp) / 2;
    keyframeStyleData[`${Math.min(newTimestamp, ExitingFinalStep)}`] = styles;
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

  const additionalData: TransformData = {
    translateX: `${transitionData.translateX}px`,
    translateY: `${transitionData.translateY}px`,
    scale: `${transitionData.scaleX},${transitionData.scaleY}`,
  };

  const keyframeData: AnimationData = {
    name,
    style: {},
    duration: 300,
  };

  addTransformToKeepPosition(
    keyframeData.style,
    exitingAnimationData.style,
    additionalData
  );

  for (const [timestamp, styles] of Object.entries(
    enteringAnimationData.style
  )) {
    keyframeData.style[parseInt(timestamp) / 2 + EnteringStartStep] = styles;
  }

  return keyframeData;
}
