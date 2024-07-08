'use strict';
import type { AnimationData, TransitionData } from '../animationParser';
import { AnimationsData } from '../config';

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

  const additionalData = {
    translateX: `${transitionData.translateX}px`,
    translateY: `${transitionData.translateY}px`,
    scale: `${transitionData.scaleX},${transitionData.scaleY}`,
  };

  const keyframeData: AnimationData = {
    name: name,
    style: {},
    duration: 300,
  };

  for (const [timestamp, styles] of Object.entries(
    exitingAnimationData.style
  )) {
    if (styles.transform !== undefined) {
      styles.transform.unshift(additionalData);
    }

    const newTimestamp = parseInt(timestamp) / 2;

    keyframeData.style[`${newTimestamp === 50 ? 49 : newTimestamp}`] = styles;
  }

  for (const [timestamp, styles] of Object.entries(
    enteringAnimationData.style
  )) {
    keyframeData.style[parseInt(timestamp) / 2 + 50] = styles;
  }

  return keyframeData;
}
