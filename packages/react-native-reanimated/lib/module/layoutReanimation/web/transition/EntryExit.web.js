'use strict';

import { AnimationsData } from '../config';
const ExitingFinalStep = 49;
const EnteringStartStep = 50;
// Layout transitions on web work in "reverse order". It means that the element is rendered at its destination and then, at the beginning of the animation,
// we move it back to its starting point.
// This function is responsible for adding transition data into beginning of each keyframe step.
// Doing so will ensure that the element will perform animation from correct position.
function addTransformToKeepPosition(keyframeStyleData, animationStyle, transformData, isExiting) {
  for (const [timestamp, styles] of Object.entries(animationStyle)) {
    if (styles.transform !== undefined) {
      // If transform was defined, we want to put transform from transition at the beginning, hence we use `unshift`
      styles.transform.unshift(transformData);
    } else {
      // If transform was undefined, we simply add transform from transition
      styles.transform = [transformData];
    }
    const newTimestamp = parseInt(timestamp) / 2;
    const index = isExiting ? Math.min(newTimestamp, ExitingFinalStep) // We want to squeeze exiting animation from range 0-100 into range 0-49
    : newTimestamp + EnteringStartStep; // Entering animation will start from 50 and go up to 100

    keyframeStyleData[`${index}`] = styles;
  }
}

// EntryExit transition consists of two animations - exiting and entering.
// In Keyframes one cannot simply specify animation for given frame. Switching from one animation
// to the other one between steps 49 and 50 may lead to flickers, since browser tries to interpolate
// one step into the other. To avoid that, we set components' `opacity` to 0 right before switching animation
// and set it again to 1 when component is in right position. Hiding component between animations
// prevents flickers.
function hideComponentBetweenAnimations(keyframeStyleData) {
  // We have to take into account that some animations have already defined `opacity`.
  // In that case, we don't want to override it.
  const opacityInStep = new Map();
  if (keyframeStyleData[0].opacity === undefined) {
    opacityInStep.set(48, 1);
    opacityInStep.set(49, 0);
  }
  if (keyframeStyleData[50].opacity === undefined) {
    opacityInStep.set(50, 0);
    opacityInStep.set(51, 1);
  }
  for (const [step, opacity] of opacityInStep) {
    keyframeStyleData[step] = {
      ...keyframeStyleData[step],
      opacity
    };
  }
}
export function EntryExitTransition(name, transitionData) {
  const exitingAnimationData = structuredClone(AnimationsData[transitionData.exiting]);
  const enteringAnimationData = structuredClone(AnimationsData[transitionData.entering]);
  const additionalExitingData = {
    translateX: `${transitionData.translateX}px`,
    translateY: `${transitionData.translateY}px`,
    scale: `${transitionData.scaleX},${transitionData.scaleY}`
  };
  const additionalEnteringData = {
    translateX: `0px`,
    translateY: `0px`,
    scale: `1,1`
  };
  const keyframeData = {
    name,
    style: {},
    duration: 300
  };
  addTransformToKeepPosition(keyframeData.style, exitingAnimationData.style, additionalExitingData, true);
  addTransformToKeepPosition(keyframeData.style, enteringAnimationData.style, additionalEnteringData, false);
  hideComponentBetweenAnimations(keyframeData.style);
  return keyframeData;
}
//# sourceMappingURL=EntryExit.web.js.map